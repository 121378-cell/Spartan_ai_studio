/**
 * React Native Auth Screens Service
 * Phase C: Mobile App Implementation - Week 11 Day 1
 * 
 * Auth screens generation and management
 */

import { logger } from '../utils/logger';

export interface AuthScreenConfig {
  showEmail: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  showName: boolean;
  showSocialLogin: boolean;
  socialProviders: string[];
  showForgotPassword: boolean;
  showRegister: boolean;
  passwordMinLength: number;
  passwordRequirements: PasswordRequirements;
  [key: string]: any;
}

export interface PasswordRequirements {
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

export interface AuthScreenFile {
  filename: string;
  content: string;
  type: 'screen' | 'component' | 'hook' | 'validation';
}

/**
 * React Native Auth Screens Service
 */
export class RNAuthScreensService {
  private config: AuthScreenConfig;

  constructor(config?: Partial<AuthScreenConfig>) {
    this.config = {
      showEmail: true,
      showPassword: true,
      showConfirmPassword: true,
      showName: true,
      showSocialLogin: true,
      socialProviders: ['google', 'apple', 'facebook'],
      showForgotPassword: true,
      showRegister: true,
      passwordMinLength: 8,
      passwordRequirements: {
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialChar: false
      },
      ...config
    };

    logger.info('RNAuthScreensService initialized', {
      context: 'rn-auth-screens',
      metadata: this.config
    });
  }

  /**
   * Generate all auth screens
   */
  generateAllScreens(): AuthScreenFile[] {
    const files: AuthScreenFile[] = [];

    // Login Screen
    files.push({
      filename: 'screens/auth/LoginScreen.tsx',
      content: this.generateLoginScreen(),
      type: 'screen'
    });

    // Register Screen
    files.push({
      filename: 'screens/auth/RegisterScreen.tsx',
      content: this.generateRegisterScreen(),
      type: 'screen'
    });

    // Forgot Password Screen
    if (this.config.showForgotPassword) {
      files.push({
        filename: 'screens/auth/ForgotPasswordScreen.tsx',
        content: this.generateForgotPasswordScreen(),
        type: 'screen'
      });
    }

    // Auth Hooks
    files.push({
      filename: 'hooks/useAuth.ts',
      content: this.generateAuthHook(),
      type: 'hook'
    });

    // Auth Validation
    files.push({
      filename: 'utils/authValidation.ts',
      content: this.generateAuthValidation(),
      type: 'validation'
    });

    logger.info('Auth screens generated', {
      context: 'rn-auth-screens',
      metadata: {
        totalFiles: files.length
      }
    });

    return files;
  }

  /**
   * Generate Login Screen
   */
  private generateLoginScreen(): string {
    return `import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      // Navigation handled by auth hook
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="barbell" size={64} color="#4F46E5" />
          <Text style={styles.title}>Spartan Hub</Text>
          <Text style={styles.subtitle}>Welcome back!</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={24} color="#6B7280" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={24} color="#6B7280" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          {${this.config.showForgotPassword} && (
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          {${this.config.showSocialLogin} && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                ${this.config.socialProviders.includes('google') ? `<TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => {/* Handle Google login */}}
                >
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                </TouchableOpacity>` : ''}
                ${this.config.socialProviders.includes('apple') ? `<TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => {/* Handle Apple login */}}
                >
                  <Ionicons name="logo-apple" size={24} color="#000000" />
                </TouchableOpacity>` : ''}
                ${this.config.socialProviders.includes('facebook') ? `<TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => {/* Handle Facebook login */}}
                >
                  <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                </TouchableOpacity>` : ''}
              </View>
            </>
          )}

          {${this.config.showRegister} && (
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 40
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8
  },
  form: {
    width: '100%'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16
  },
  icon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#111827'
  },
  eyeIcon: {
    padding: 8
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24
  },
  forgotPasswordText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600'
  },
  button: {
    backgroundColor: '#4F46E5',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB'
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  registerText: {
    color: '#6B7280',
    fontSize: 16
  },
  registerLink: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600'
  }
});
`;
  }

  /**
   * Generate Register Screen
   */
  private generateRegisterScreen(): string {
    return `import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword } from '../../utils/authValidation';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    const passwordValidation = validatePassword(password, {
      minLength: ${this.config.passwordMinLength},
      requireUppercase: ${this.config.passwordRequirements.requireUppercase},
      requireLowercase: ${this.config.passwordRequirements.requireLowercase},
      requireNumber: ${this.config.passwordRequirements.requireNumber},
      requireSpecialChar: ${this.config.passwordRequirements.requireSpecialChar}
    });

    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      // Navigation handled by auth hook
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="barbell" size={64} color="#4F46E5" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Spartan Hub today</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={24} color="#6B7280" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={24} color="#6B7280" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={24} color="#6B7280" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={24} color="#6B7280" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 32
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8
  },
  form: {
    width: '100%'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16
  },
  icon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#111827'
  },
  eyeIcon: {
    padding: 8
  },
  button: {
    backgroundColor: '#4F46E5',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600'
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  loginText: {
    color: '#6B7280',
    fontSize: 16
  },
  loginLink: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600'
  }
});
`;
  }

  /**
   * Generate Forgot Password Screen
   */
  private generateForgotPasswordScreen(): string {
    return `import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { validateEmail } from '../../utils/authValidation';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setLoading(true);

    try {
      // API call to reset password
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="mail" size={64} color="#10B981" />
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successText}>
            We've sent password reset instructions to {email}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="lock-closed-outline" size={64} color="#4F46E5" />
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your email and we'll send you reset instructions.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={24} color="#6B7280" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="arrow-back" size={20} color="#4F46E5" />
            <Text style={styles.backLinkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 32
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center'
  },
  form: {
    width: '100%'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16
  },
  icon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#111827'
  },
  button: {
    backgroundColor: '#4F46E5',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600'
  },
  successContainer: {
    alignItems: 'center',
    padding: 24
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24
  },
  successText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12
  },
  backButton: {
    backgroundColor: '#4F46E5',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingHorizontal: 32
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600'
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24
  },
  backLinkText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  }
});
`;
  }

  /**
   * Generate Auth Hook
   */
  private generateAuthHook(): string {
    return `import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApiService } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const navigation = useNavigation();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');

      if (token && userData) {
        setState({
          user: JSON.parse(userData),
          token,
          loading: false,
          error: null
        });
        // Navigate to main app
        navigation.navigate('MainTabs' as never);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: 'Failed to load user' }));
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await mobileApiService.login(email, password);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        
        setState({
          user,
          token,
          loading: false,
          error: null
        });

        // Navigate to main app
        navigation.navigate('MainTabs' as never);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await mobileApiService.register(email, password, name);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        
        setState({
          user,
          token,
          loading: false,
          error: null
        });

        // Navigate to main app
        navigation.navigate('MainTabs' as never);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await mobileApiService.logout();
      
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      
      setState({
        user: null,
        token: null,
        loading: false,
        error: null
      });

      // Navigate to login
      navigation.navigate('Login' as never);
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  };

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.token,
    login,
    register,
    logout
  };
};
`;
  }

  /**
   * Generate Auth Validation
   */
  private generateAuthValidation(): string {
    return `export interface PasswordValidation {
  valid: boolean;
  message: string;
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (
  password: string,
  requirements: PasswordRequirements
): PasswordValidation => {
  if (password.length < requirements.minLength) {
    return {
      valid: false,
      message: \`Password must be at least \${requirements.minLength} characters\`
    };
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }

  if (requirements.requireNumber && !/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number'
    };
  }

  if (requirements.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character'
    };
  }

  return {
    valid: true,
    message: 'Password is valid'
  };
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

export const getPasswordStrength = (password: string): number => {
  let strength = 0;

  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;

  return Math.min(100, strength);
};
`;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const isHealthy = true;

    logger.debug('RN Auth Screens health check', {
      context: 'rn-auth-screens',
      metadata: {
        healthy: isHealthy,
        config: this.config
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const rnAuthScreensService = new RNAuthScreensService();

export default rnAuthScreensService;
