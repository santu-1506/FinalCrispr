const { createClient } = require('@supabase/supabase-js');

// Supabase configuration for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// Create Supabase client with service role key for server operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to check if Supabase is properly configured
const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://your-project.supabase.co' && 
         supabaseServiceRoleKey !== 'your-service-role-key' &&
         supabaseUrl && supabaseServiceRoleKey;
};

// Send OTP to phone number
const sendPhoneOTP = async (phoneNumber) => {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not properly configured');
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'sms',
      phone: phoneNumber,
      options: {
        data: {
          app_name: 'CRISPR Predict'
        }
      }
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Supabase send OTP error:', error);
    return { success: false, error: error.message };
  }
};

// Verify OTP
const verifyPhoneOTP = async (phoneNumber, token) => {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not properly configured');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: token,
      type: 'sms'
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Supabase verify OTP error:', error);
    return { success: false, error: error.message };
  }
};

// Get user by phone number from Supabase
const getUserByPhone = async (phoneNumber) => {
  try {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Adjust as needed
    });

    if (error) {
      throw error;
    }

    const user = users.find(u => u.phone === phoneNumber);
    return user || null;
  } catch (error) {
    console.error('Get user by phone error:', error);
    return null;
  }
};

module.exports = {
  supabase,
  isSupabaseConfigured,
  sendPhoneOTP,
  verifyPhoneOTP,
  getUserByPhone
};
