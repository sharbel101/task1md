"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";
import { RealtimeChannel } from '@supabase/supabase-js';
import { sendEmail } from '../sendEmail';

interface Submission {
  id: string;
  full_name: string;
  phone: string;
  location: string;
  email: string;
  hobbies: string;
  profile_pic_url: string | null;
  source_code_url: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  feedback?: string;
  created_at: string;
  evaluated_at?: string;
}

export default function EvaluatePage() {
  const { userRole } = useAuth();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentSubmissionIndex, setCurrentSubmissionIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [decision, setDecision] = useState<"accepted" | "rejected" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // Simplified role check
  useEffect(() => {
    console.log('Current userRole:', userRole);
    if (userRole === null) {
      // Still loading, do nothing
      return;
    }
    if (userRole !== "evaluator") {
      console.log('Invalid role, redirecting to login');
      router.push("/login");
    } else {
      // Role is valid, fetch submissions
      fetchPendingSubmissions();
    }
  }, [userRole, router]);

  // Simplified real-time subscription
  useEffect(() => {
    if (userRole !== "evaluator") return;

    console.log('Setting up real-time subscription');
    const channel = supabase
      .channel('submissions')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: 'status=eq.pending'
        },
        (payload: { 
          eventType: 'INSERT' | 'UPDATE' | 'DELETE',
          new: Submission,
          old: Submission
        }) => {
          console.log('Realtime update received:', payload);
          if (payload.eventType === 'UPDATE') {
            setSubmissions(current => 
              current.map(sub => 
                sub.id === payload.new.id ? { ...sub, ...payload.new } as Submission : sub
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setSubmissions(current => [...current, payload.new as Submission]);
          } else if (payload.eventType === 'DELETE') {
            setSubmissions(current => 
              current.filter(sub => sub.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  const fetchPendingSubmissions = async () => {
    console.log('Fetching pending submissions...');
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching submissions:', error);
        throw error;
      }
      
      console.log('Fetched submissions:', data?.length || 0);
      setSubmissions(data || []);
      setCurrentSubmissionIndex(0);
      setFeedback("");
      setDecision(null);
    } catch (error) {
      console.error('Error in fetchPendingSubmissions:', error);
      showStatus('Error fetching submissions', 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to show temporary status messages
  const showStatus = (message: string, duration: number = 3000) => {
    setUpdateStatus(message);
    setTimeout(() => setUpdateStatus(null), duration);
  };

  const getCurrentSubmission = () => {
    const submission = submissions[currentSubmissionIndex];
    if (!submission) return null;

    // Get the latest version of the submission from the database
    return submission;
  };

  const handleDownload = async (url: string | null, filename: string) => {
    if (!url) return;
    
    try {
      // For profile pictures, the URL is just the filename
      const bucket = filename === 'profile_picture.jpg' ? 'profile-pictures' : 'source-code';
      const path = url; // The URL is already the path for profile pictures

      console.log(`Attempting to download from bucket: ${bucket}, path: ${path}`);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) {
        console.error('Storage error details:', {
          message: error.message,
          name: error.name
        });
        throw error;
      }

      if (!data) {
        throw new Error('No data received from storage');
      }

      // For profile pictures, try to determine the correct file extension
      let downloadFilename = filename;
      if (filename === 'profile_picture.jpg') {
        // Try to get the original file extension from the path
        const originalExt = path.split('.').pop()?.toLowerCase();
        if (originalExt && ['jpg', 'jpeg', 'png', 'gif'].includes(originalExt)) {
          downloadFilename = `profile_picture.${originalExt}`;
        }
      }

      const blob = new Blob([data]);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = downloadFilename;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      let errorMessage = 'Error downloading file. ';
      
      if (error.message) {
        errorMessage += error.message;
      } else if (error.code === '23505') {
        errorMessage += 'File not found.';
      } else if (error.code === '42501') {
        errorMessage += 'Permission denied. Please check your access rights.';
      } else if (error.code === '42P01') {
        errorMessage += 'Storage bucket not found. Please contact support.';
      } else {
        errorMessage += 'Please try again. If the problem persists, contact support.';
      }
      
      alert(errorMessage);
    }
  };

  const handleDecision = async (decisionType: "accepted" | "rejected") => {
    const currentSubmission = getCurrentSubmission();
    if (!currentSubmission) return;

    setIsUpdating(true);
    showStatus('Processing your decision...');

    try {
      // First, verify we can still update this submission
      const { data: verifyData, error: verifyError } = await supabase
        .from('submissions')
        .select('status')
        .eq('id', currentSubmission.id)
        .single();

      if (verifyError) {
        throw new Error(`Verification failed: ${verifyError.message}`);
      }

      if (verifyData.status !== 'pending') {
        throw new Error('This submission has already been evaluated');
      }

      // Update submission with optimistic update
      const optimisticUpdate = {
        ...currentSubmission,
        status: decisionType,
        feedback: feedback,
        evaluated_at: new Date().toISOString()
      };

      // Optimistically update the UI
      setSubmissions(current => 
        current.map(sub => 
          sub.id === currentSubmission.id ? optimisticUpdate : sub
        )
      );

      // Perform the actual update
      const { data: updateData, error: updateError } = await supabase
        .from('submissions')
        .update({
          status: decisionType,
          feedback: feedback,
          evaluated_at: new Date().toISOString()
        })
        .eq('id', currentSubmission.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw new Error(`Update failed: ${updateError.message}`);
      }

      if (!updateData) {
        throw new Error('No data returned from update operation');
      }

      // Now try to insert the feedback
      const feedbackData = {
        submission_id: currentSubmission.id,
        message: `Application ${decisionType}: ${feedback}`,
        created_at: new Date().toISOString()
      };

      const { data: insertedFeedback, error: feedbackError } = await supabase
        .from('feedback')
        .insert([feedbackData])
        .select()
        .single();

      if (feedbackError) {
        console.error('Feedback error details:', {
          code: feedbackError.code,
          message: feedbackError.message,
          details: feedbackError.details,
          hint: feedbackError.hint
        });
        throw new Error(`Feedback creation failed: ${feedbackError.message}`);
      }

      // Send email notification to the developer
      try {
        const emailSubject = `Your Application Has Been ${decisionType === 'accepted' ? 'Approved' : 'Reviewed'}`;
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${decisionType === 'accepted' ? '#10B981' : '#EF4444'};">
              Application ${decisionType === 'accepted' ? 'Approved' : 'Reviewed'}
            </h2>
            <p>Dear ${currentSubmission.full_name},</p>
            <p>Your application has been ${decisionType === 'accepted' ? 'approved' : 'reviewed'}.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #4B5563; margin-top: 0;">Feedback:</h3>
              <p style="color: #1F2937; white-space: pre-wrap;">${feedback}</p>
            </div>
            ${decisionType === 'accepted' 
              ? '<p style="color: #059669;">Welcome to the team! We look forward to working with you.</p>'
              : '<p style="color: #DC2626;">Thank you for your interest. We wish you the best in your future endeavors.</p>'
            }
            <p>Best regards,<br>The Evaluation Team</p>
          </div>
        `;

        await sendEmail(
          currentSubmission.email,
          emailSubject,
          emailBody
        );
        
        console.log('Email notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't throw the error - we don't want to fail the whole operation if just the email fails
      }

      setDecision(decisionType);
      showStatus(`Successfully ${decisionType} the application`);
      
      // Move to next submission after a brief delay
      setTimeout(() => {
        if (currentSubmissionIndex < submissions.length - 1) {
          setCurrentSubmissionIndex(currentSubmissionIndex + 1);
          setFeedback("");
          setDecision(null);
        } else {
          fetchPendingSubmissions();
        }
      }, 2000);

    } catch (error: any) {
      console.error('Full error details:', error);
      
      // Revert optimistic update
      fetchPendingSubmissions();
      
      // Show appropriate error message
      let errorMessage = 'Error updating submission. ';
      if (error.message) {
        errorMessage += error.message;
      } else if (error.code === '23505') {
        errorMessage += 'This submission has already been evaluated.';
      } else if (error.code === '42501') {
        errorMessage += 'Permission denied. Please check your access rights.';
      } else if (error.code === '42P01') {
        errorMessage += 'Database table not found. Please contact support.';
      } else {
        errorMessage += 'Please try again. If the problem persists, contact support.';
      }
      
      showStatus(errorMessage, 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReturnToLogin = () => {
    router.push("/login");
  };

  const handleNextSubmission = () => {
    if (currentSubmissionIndex < submissions.length - 1) {
      setCurrentSubmissionIndex(currentSubmissionIndex + 1);
      setFeedback("");
      setDecision(null);
    }
  };

  const handlePreviousSubmission = () => {
    if (currentSubmissionIndex > 0) {
      setCurrentSubmissionIndex(currentSubmissionIndex - 1);
      setFeedback("");
      setDecision(null);
    }
  };

  // Simplified loading states
  if (userRole === null) {
    console.log('Rendering initial loading state');
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950 p-4">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Loading...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </main>
    );
  }

  if (userRole !== "evaluator") {
    console.log('Rendering invalid role state');
    return null;
  }

  if (isLoading) {
    console.log('Rendering submissions loading state');
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950 p-4">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Loading submissions...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </main>
    );
  }

  const currentSubmission = getCurrentSubmission();

  if (!currentSubmission) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950 p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-10 max-w-xl w-full space-y-8 text-center">
          <button
            onClick={handleReturnToLogin}
            className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-purple-500/20 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 text-sm mb-4"
          >
            Return to Login
          </button>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            No Pending Submissions
          </h2>
          <p className="text-white">All submissions have been evaluated.</p>
          <button
            onClick={fetchPendingSubmissions}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-700 hover:to-purple-800 hover:shadow-lg hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300"
          >
            Refresh
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950 p-6">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-10 max-w-xl w-full space-y-8">
        {/* Status message */}
        {updateStatus && (
          <div className="p-4 rounded-lg text-center bg-purple-900/50 border border-purple-500/30 text-purple-100 animate-fade-in">
            {updateStatus}
          </div>
        )}

        {/* Header with navigation */}
        <div className="flex justify-between items-center">
          <div className="text-white text-sm">
            Submission {currentSubmissionIndex + 1} of {submissions.length}
          </div>
          <button
            onClick={handleReturnToLogin}
            className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-purple-500/20 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 text-sm"
          >
            Return to Login
          </button>
        </div>

        <h2 className="text-3xl font-extrabold text-center text-white tracking-tight">
          Evaluate Developer Submission
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-white font-medium">Full Name</label>
            <p className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white">
              {currentSubmission.full_name}
            </p>
          </div>
          <div>
            <label className="block text-white font-medium">Phone Number</label>
            <p className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white">
              {currentSubmission.phone}
            </p>
          </div>
          <div>
            <label className="block text-white font-medium">Location</label>
            <p className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white">
              {currentSubmission.location}
            </p>
          </div>
          <div>
            <label className="block text-white font-medium">Email Address</label>
            <p className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white">
              {currentSubmission.email}
            </p>
          </div>
          <div>
            <label className="block text-white font-medium">Hobbies</label>
            <p className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white">
              {currentSubmission.hobbies}
            </p>
          </div>
          <div>
            <label className="block text-white font-medium">Profile Picture</label>
            {currentSubmission.profile_pic_url ? (
              <div className="space-y-2">
                <p className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white">
                  Profile picture uploaded
                </p>
                <button
                  onClick={() => handleDownload(currentSubmission.profile_pic_url, 'profile_picture.jpg')}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-700 hover:to-purple-800 hover:shadow-lg hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300"
                >
                  Download Profile Picture
                </button>
              </div>
            ) : (
              <p className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white">
                No profile picture provided
              </p>
            )}
          </div>
          <div>
            <label className="block text-white font-medium">Source Code</label>
            {currentSubmission.source_code_url ? (
              <button
                onClick={() => handleDownload(currentSubmission.source_code_url, 'source.zip')}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-700 hover:to-purple-800 hover:shadow-lg hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300"
              >
                Download Source Code
              </button>
            ) : (
              <p className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white">
                No source code provided
              </p>
            )}
          </div>
        </div>

        <textarea
          placeholder="Enter your feedback for the developer"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={isUpdating}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
          rows={4}
        />

        {/* Navigation buttons */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={handlePreviousSubmission}
            disabled={currentSubmissionIndex === 0}
            className="flex-1 bg-white/10 text-white py-2 rounded-lg hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-purple-500/20 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNextSubmission}
            disabled={currentSubmissionIndex === submissions.length - 1}
            className="flex-1 bg-white/10 text-white py-2 rounded-lg hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-purple-500/20 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => handleDecision("accepted")}
            disabled={isUpdating || !feedback.trim()}
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-700 hover:to-purple-800 hover:shadow-lg hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Processing...' : 'Welcome to the Team'}
          </button>
          <button
            onClick={() => handleDecision("rejected")}
            disabled={isUpdating || !feedback.trim()}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg hover:bg-gradient-to-r hover:from-red-700 hover:to-red-800 hover:shadow-lg hover:shadow-red-500/50 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Processing...' : 'We Are Sorry'}
          </button>
        </div>

        {decision && (
          <p className="text-center text-white font-medium">
            Decision: {decision === "accepted" ? "Accepted" : "Rejected"}
          </p>
        )}
      </div>
    </main>
  );
}