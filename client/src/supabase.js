import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey)

// Phone authentication helper functions
export const sendPhoneOTP = async (phone) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phone,
      options: {
        // You can customize the SMS template here
        data: {
          app_name: 'CRISPR Predict'
        }
      }
    })

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('Supabase OTP send error:', error)
    return { success: false, error: error.message }
  }
}

export const verifyPhoneOTP = async (phone, token) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: token,
      type: 'sms'
    })

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('Supabase OTP verify error:', error)
    return { success: false, error: error.message }
  }
}

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://your-project.supabase.co' && 
         supabaseKey !== 'your-anon-key' &&
         supabaseUrl && supabaseKey
}

// Helper to get current user session
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

export default supabase
