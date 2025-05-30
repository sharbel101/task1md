"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient"; // Adjust path as needed
import imageCompression from 'browser-image-compression';

export default function SubmitPage() {
  const { userRole } = useAuth();
  const router = useRouter();

  // State declarations
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [sourceCode, setSourceCode] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    'profile-pictures'?: number;
    'source-code'?: number;
  }>({});

  // Redirect non-developers to login
  useEffect(() => {
    if (userRole && userRole !== "developer") {
      router.push("/login");
    }
  }, [userRole, router]);

  // Show loading state while userRole is not known yet
  if (!userRole) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950 p-6">
        <p className="text-white text-lg">Loading...</p>
      </main>
    );
  }

  // If userRole is not developer, don't render the form
  if (userRole !== "developer") {
    return null;
  }

  const compressImage = async (file: File): Promise<File> => {
    setIsProcessingImage(true);
    console.log('Original file size:', file.size / 1024 / 1024, 'MB');
    
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        fileType: file.type
      };

      const compressedFile = await imageCompression(file, options);
      console.log('Compressed file size:', compressedFile.size / 1024 / 1024, 'MB');
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Failed to compress image');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setProfilePic(null);
      return;
    }

    try {
      setSubmitStatus("Processing image...");
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      // Validate file size (show warning if over 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSubmitStatus("Large image detected, compressing...");
      }

      const compressedFile = await compressImage(file);
      setProfilePic(compressedFile);
      setSubmitStatus(`Image processed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error processing image:', error);
      setSubmitStatus(`Error: ${error.message || 'Failed to process image'}`);
      setProfilePic(null);
      // Reset the file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const uploadFile = async (file: File, bucket: 'profile-pictures' | 'source-code'): Promise<string> => {
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => ({
        ...prev,
        [bucket]: Math.min((prev[bucket] || 0) + 10, 90)
      }));
    }, 500);

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) throw error;
      
      // Set progress to 100% on success
      setUploadProgress(prev => ({
        ...prev,
        [bucket]: 100
      }));
      
      return filePath;
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("Starting submission...");
    setUploadProgress({});

    try {
      // First, test the database connection
      setSubmitStatus("Verifying connection...");
      const { error: testError } = await supabase
        .from('submissions')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('Database connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }

      let uploadedProfilePicUrl: string | null = null;
      let uploadedSourceCodeUrl: string | null = null;

      // Upload profile picture if provided
      if (profilePic) {
        try {
          setSubmitStatus("Uploading profile picture...");
          uploadedProfilePicUrl = await uploadFile(profilePic, 'profile-pictures');
        } catch (err: unknown) {
          const error = err as Error;
          console.error('Error uploading profile picture:', error);
          throw new Error(`Profile picture upload failed: ${error.message || 'Unknown error'}`);
        }
      }

      // Upload source code if provided
      if (sourceCode) {
        try {
          setSubmitStatus("Uploading source code...");
          uploadedSourceCodeUrl = await uploadFile(sourceCode, 'source-code');
        } catch (err: unknown) {
          const error = err as Error;
          console.error('Error uploading source code:', error);
          throw new Error(`Source code upload failed: ${error.message || 'Unknown error'}`);
        }
      }

      // Insert submission into database
      setSubmitStatus("Saving submission...");
      const { data, error } = await supabase
        .from('submissions')
        .insert([
          {
            full_name: fullName,
            phone: phone,
            location: location,
            email: email,
            hobbies: hobbies,
            profile_pic_url: uploadedProfilePicUrl,
            source_code_url: uploadedSourceCodeUrl,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Database error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from insert operation');
      }

      setSubmitStatus('Submission successful! Your application has been received.');
      
      // Reset form after a delay
      setTimeout(() => {
        setFullName("");
        setPhone("");
        setLocation("");
        setEmail("");
        setHobbies("");
        setProfilePic(null);
        setSourceCode(null);
        setUploadProgress({});
        setIsSubmitting(false);
      }, 2000);

    } catch (error: unknown) {
      console.error('Full error object:', error);
      let errorMessage = 'Error submitting application. ';
      
      if (error instanceof Error) {
        errorMessage += error.message;
      } else if (typeof error === 'object' && error !== null && 'code' in error) {
        const code = error.code as string;
        if (code === '23505') {
          errorMessage = 'This email has already been used for a submission.';
        } else if (code === '42501') {
          errorMessage = 'Permission denied. Please check your access rights.';
        } else if (code === '42P01') {
          errorMessage = 'Database table not found. Please contact support.';
        }
      }
      
      setSubmitStatus(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleReturnToLogin = () => {
    router.push("/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-10 max-w-xl w-full space-y-8"
      >
        {/* Return to Login Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleReturnToLogin}
            className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-purple-500/20 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 text-sm font-medium border border-white/20"
          >
            Return to Login
          </button>
        </div>

        <h2 className="text-3xl font-extrabold text-center text-white tracking-tight">
          Developer Submission Form
        </h2>

        {/* Status Messages */}
        {submitStatus && (
          <div className={`p-4 rounded-lg text-center ${
            submitStatus.includes('Error') 
              ? 'bg-red-900/50 border border-red-500/30 text-red-100' 
              : 'bg-purple-900/50 border border-purple-500/30 text-purple-100'
          } animate-fade-in`}>
            {submitStatus}
          </div>
        )}

        {/* Upload Progress Bars */}
        {(uploadProgress['profile-pictures'] || uploadProgress['source-code']) && (
          <div className="space-y-2">
            {uploadProgress['profile-pictures'] !== undefined && (
              <div>
                <div className="flex justify-between text-sm text-white/70 mb-1">
                  <span>Profile Picture</span>
                  <span>{uploadProgress['profile-pictures']}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${uploadProgress['profile-pictures']}%` }}
                  />
                </div>
              </div>
            )}
            {uploadProgress['source-code'] !== undefined && (
              <div>
                <div className="flex justify-between text-sm text-white/70 mb-1">
                  <span>Source Code</span>
                  <span>{uploadProgress['source-code']}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${uploadProgress['source-code']}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
          required
          disabled={isSubmitting || isProcessingImage}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
        />

        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          required
          disabled={isSubmitting || isProcessingImage}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
        />

        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
          required
          disabled={isSubmitting || isProcessingImage}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          disabled={isSubmitting || isProcessingImage}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
        />

        <textarea
          placeholder="What do you like to do in life (other than coding)?"
          value={hobbies}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHobbies(e.target.value)}
          required
          disabled={isSubmitting || isProcessingImage}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
          rows={4}
        />

        <label className="block text-white font-medium">
          Profile Picture (max 1MB, max 1080px)
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePicChange}
              disabled={isSubmitting || isProcessingImage}
              className="mt-1 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isProcessingImage && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {profilePic && (
            <p className="mt-1 text-sm text-white/70">
              Selected: {profilePic.name} ({(profilePic.size / 1024 / 1024).toFixed(2)}MB)
            </p>
          )}
        </label>

        <label className="block text-white font-medium">
          Source Code (ZIP file)
          <input
            type="file"
            accept=".zip"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSourceCode(e.target.files ? e.target.files[0] : null)
            }
            disabled={isSubmitting || isProcessingImage}
            className="mt-1 text-white disabled:opacity-50"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || isProcessingImage}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-700 hover:to-purple-800 hover:shadow-lg hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative"
        >
          {isSubmitting ? (
            <>
              <span className="opacity-0">Submit</span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            </>
          ) : (
            'Submit'
          )}
        </button>
      </form>
    </main>
  );
}