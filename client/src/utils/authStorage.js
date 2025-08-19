// Authentication and credential storage utilities

export const authStorage = {
  // Check if user is authenticated
  isAuthenticated: () => {
    return localStorage.getItem('isAuthenticated') === 'true';
  },

  // Get current user info
  getCurrentUser: () => {
    if (!authStorage.isAuthenticated()) return null;
    
    return {
      email: localStorage.getItem('userEmail'),
      name: localStorage.getItem('userName'),
      isAuthenticated: true
    };
  },


  // Save user session
  saveUserSession: (email, name) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', name);
  },

  // Clear user session
  clearUserSession: () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
  },

  // Remember Me functionality
  saveCredentials: (email, password) => {
    localStorage.setItem('savedEmail', email);
    localStorage.setItem('savedPassword', password);
    localStorage.setItem('rememberMe', 'true');
  },

  // Get saved credentials
  getSavedCredentials: () => {
    const shouldRemember = localStorage.getItem('rememberMe') === 'true';
    if (!shouldRemember) return null;

    return {
      email: localStorage.getItem('savedEmail'),
      password: localStorage.getItem('savedPassword'),
      rememberMe: true
    };
  },

  // Clear saved credentials
  clearSavedCredentials: () => {
    localStorage.removeItem('savedEmail');
    localStorage.removeItem('savedPassword');
    localStorage.removeItem('rememberMe');
  },

  // Complete logout (session + saved credentials + Google auth)
  completeLogout: () => {
    authStorage.clearUserSession();
    authStorage.clearSavedCredentials();
    localStorage.removeItem('googleAuth');
  },

  // Check if user authenticated via Google
  isGoogleAuth: () => {
    return localStorage.getItem('googleAuth') === 'true';
  },

  // Save Google authentication marker
  saveGoogleAuth: () => {
    localStorage.setItem('googleAuth', 'true');
  }
};

export default authStorage;
