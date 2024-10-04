import React from 'react';
import { FacebookIcon, InstagramIcon, TwitterIcon, ExternalLink as GoogleIcon } from 'lucide-react';

const SignUp = ({ onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-[9999]">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80 z-[10000]">
        <h2 className="text-lg font-semibold mb-4">Sign Up</h2>
        <p className="mb-4">Please Sign Up to access features.</p>
        <div className="flex flex-col space-y-4">
          <a href="/auth/facebook" className="p-4 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700">
            <FacebookIcon size={24} />
            <span className="ml-2">Login with Facebook</span>
          </a>
          <a href="/auth/instagram" className="p-4 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-full flex items-center justify-center shadow-md hover:from-pink-600 hover:to-orange-500">
            <InstagramIcon size={24} />
            <span className="ml-2">Login with Instagram</span>
          </a>
          <a href="/auth/twitter" className="p-4 bg-blue-400 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-500">
            <TwitterIcon size={24} />
            <span className="ml-2">Login with Twitter</span>
          </a>
          <a href="/auth/google" className="p-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600">
            <GoogleIcon size={24} />
            <span className="ml-2">Login with Google</span>
          </a>
        </div>
        <button
          onClick={onClose}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SignUp;
