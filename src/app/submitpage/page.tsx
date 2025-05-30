"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient"; // Adjust path as needed

export default function SubmitPage() {
  const { userRole } = useAuth();
  const router = useRouter();

  // Move all state declarations to the top level
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [sourceCode, setSourceCode] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

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

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) throw error;
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // First, test the database connection
      const { error: testError } = await supabase
        .from('submissions')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('Database connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }

      let profilePicUrl = null;
      let sourceCodeUrl = null;

      // Upload profile picture if provided
      if (profilePic) {
        try {
          profilePicUrl = await uploadFile(profilePic, 'profile-pictures');
        } catch (error: any) {
          console.error('Error uploading profile picture:', error);
          throw new Error(`Profile picture upload failed: ${error.message || 'Unknown error'}`);
        }
      }

      // Upload source code if provided
      if (sourceCode) {
        try {
          sourceCodeUrl = await uploadFile(sourceCode, 'source-code');
        } catch (error: any) {
          console.error('Error uploading source code:', error);
          throw new Error(`Source code upload failed: ${error.message || 'Unknown error'}`);
        }
      }

      // Insert submission into database
      const { data, error } = await supabase
        .from('submissions')
        .insert([
          {
            full_name: fullName,
            phone: phone,
            location: location,
            email: email,
            hobbies: hobbies,
            profile_pic_url: profilePicUrl,
            source_code_url: sourceCodeUrl,
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
      
      // Reset form
      setFullName("");
      setPhone("");
      setLocation("");
      setEmail("");
      setHobbies("");
      setProfilePic(null);
      setSourceCode(null);

    } catch (error: any) {
      console.error('Full error object:', error);
      if (error.message) {
        setSubmitStatus(`Error: ${error.message}`);
      } else if (error.code === '23505') {
        setSubmitStatus('This email has already been used for a submission.');
      } else if (error.message?.includes('storage')) {
        setSubmitStatus('Error uploading files. Please try again with smaller files.');
      } else {
        setSubmitStatus('Error submitting application. Please try again. If the problem persists, contact support.');
      }
    } finally {
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

        {submitStatus && (
          <div className={`p-4 rounded-lg text-center ${
            submitStatus.includes('Error') 
              ? 'bg-red-900/50 border border-red-500/30 text-red-100' 
              : 'bg-purple-900/50 border border-purple-500/30 text-purple-100'
          }`}>
            {submitStatus}
          </div>
        )}

        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
          required
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
        />

        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          required
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
        />

        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
          required
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
        />

        <textarea
          placeholder="What do you like to do in life (other than coding)?"
          value={hobbies}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHobbies(e.target.value)}
          required
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
          rows={4}
        />

        <label className="block text-white font-medium">
          Profile Picture (max 1MB, max 1080px)
          <input
            type="file"
            accept="image/*"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setProfilePic(e.target.files ? e.target.files[0] : null)
            }
            disabled={isSubmitting}
            className="mt-1 text-white disabled:opacity-50"
          />
        </label>

        <label className="block text-white font-medium">
          Source Code (ZIP file)
          <input
            type="file"
            accept=".zip"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSourceCode(e.target.files ? e.target.files[0] : null)
            }
            disabled={isSubmitting}
            className="mt-1 text-white disabled:opacity-50"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-700 hover:to-purple-800 hover:shadow-lg hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </main>
  );
}