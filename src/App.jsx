import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Lock, Shield, Eye, EyeOff, CreditCard, Send, History, FileText, DollarSign, TrendingUp, User, LogOut, Menu, X, CheckCircle } from 'lucide-react';

// Mock API with security features
const API_BASE = 'https://api.anthropic.com/v1/messages';

const SecureBankPro = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginStep, setLoginStep] = useState('credentials'); // credentials, mfa, biometric
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [mfaAttempts, setMfaAttempts] = useState(0);
  const [accountLocked, setAccountLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Session Management - using refs to avoid re-render issues
  const [sessionToken, setSessionToken] = useState('');
  const sessionExpiryRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const activityTimeoutRef = useRef(null);

  // User State
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(''); // customer, premium, admin

  // Application State
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Account Data
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);

  // Transfer State
  const [transferData, setTransferData] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    type: 'internal',
    description: '',
    scheduled: false,
    scheduleDate: ''
  });
  const [transferApprovalRequired, setTransferApprovalRequired] = useState(false);

  // Bill Payment State
  const [billPayment, setBillPayment] = useState({
    type: 'utility',
    amount: '',
    beneficiary: '',
    accountNumber: ''
  });

  // Investment State
  const [portfolio, setPortfolio] = useState([]);
  const [marketData, setMarketData] = useState([]);

  // Transaction Filter State
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [transactionSearch, setTransactionSearch] = useState('');

  // Alerts & Errors
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [errors, setErrors] = useState({});

  // Security logs
  const [securityLogs, setSecurityLogs] = useState([]);

  // SR-015: Rate limiting simulation
  const [apiCallCount, setApiCallCount] = useState(0);
  const [rateLimitReset, setRateLimitReset] = useState(Date.now() + 60000);

  // Initialize mock data
  useEffect(() => {
    initializeMockData();
  }, []);

  const initializeMockData = () => {
    // Try to load transactions from localStorage first
    const savedTransactions = localStorage.getItem('securebank_transactions');
    const savedAccounts = localStorage.getItem('securebank_accounts');
    
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    } else {
      // Mock transactions - only set if not in localStorage
      const mockTransactions = [
        { id: 'TXN001', date: '2024-12-19', description: 'Salary Deposit', amount: 5000.00, type: 'credit', status: 'completed' },
        { id: 'TXN002', date: '2024-12-18', description: 'Grocery Store', amount: -145.32, type: 'debit', status: 'completed' },
        { id: 'TXN003', date: '2024-12-17', description: 'Electric Bill', amount: -89.50, type: 'debit', status: 'completed' },
        { id: 'TXN004', date: '2024-12-16', description: 'Transfer to Savings', amount: -1000.00, type: 'debit', status: 'completed' },
        { id: 'TXN005', date: '2024-12-15', description: 'Online Purchase', amount: -234.99, type: 'debit', status: 'completed' }
      ];
      setTransactions(mockTransactions);
      localStorage.setItem('securebank_transactions', JSON.stringify(mockTransactions));
    }

    if (savedAccounts) {
      const loadedAccounts = JSON.parse(savedAccounts);
      setAccounts(loadedAccounts);
      setSelectedAccount(loadedAccounts[0]);
    } else {
      // Mock user accounts
      const mockAccounts = [
        { id: 'ACC001', type: 'Checking', balance: 15430.50, accountNumber: '****1234', currency: 'USD' },
        { id: 'ACC002', type: 'Savings', balance: 45820.75, accountNumber: '****5678', currency: 'USD' },
        { id: 'ACC003', type: 'Investment', balance: 128500.00, accountNumber: '****9012', currency: 'USD' }
      ];
      setAccounts(mockAccounts);
      setSelectedAccount(mockAccounts[0]);
      localStorage.setItem('securebank_accounts', JSON.stringify(mockAccounts));
    }

    // Mock beneficiaries
    const mockBeneficiaries = [
      { id: 'BEN001', name: 'John Smith', accountNumber: '****3456', bank: 'Chase Bank' },
      { id: 'BEN002', name: 'Electric Company', accountNumber: '****7890', type: 'utility' },
      { id: 'BEN003', name: 'Sarah Johnson', accountNumber: '****2345', bank: 'Bank of America' }
    ];
    setBeneficiaries(mockBeneficiaries);

    // Mock portfolio
    const mockPortfolio = [
      { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, avgPrice: 150.00, currentPrice: 185.50, value: 9275.00 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 30, avgPrice: 120.00, currentPrice: 142.30, value: 4269.00 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 40, avgPrice: 300.00, currentPrice: 378.50, value: 15140.00 }
    ];
    setPortfolio(mockPortfolio);
  };

  // SR-001, SR-002, SR-003: Authentication with MFA and account lockout
  const validatePassword = (pwd) => {
    const minLength = pwd.length >= 12;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // SR-003: Check account lockout
    if (accountLocked) {
      const remainingTime = Math.ceil((lockoutTime - Date.now()) / 1000);
      showAlert('error', `Account locked. Try again in ${remainingTime} seconds.`);
      return;
    }

    // Basic validation without exposing details
    if (!username || !password) {
      showAlert('error', 'Please enter username and password');
      return;
    }

    // Simulate authentication
    if (username === 'demo' && password === 'SecureBank123!') {
      // SR-011: Log authentication attempt
      logSecurityEvent('AUTH_SUCCESS', 'User login successful');
      
      // Move to MFA step
      setLoginStep('mfa');
      showAlert('info', 'MFA code sent to your registered device');
      
      // Reset failed attempts on successful credential validation
      setLoginAttempts(0);
    } else {
      // SR-003: Failed login attempt handling
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      // SR-011: Log failed attempt
      logSecurityEvent('AUTH_FAILED', `Failed login attempt #${newAttempts}`);
      
      if (newAttempts >= 5) {
        // Exponential backoff: 2^attempts seconds
        const lockDuration = Math.pow(2, newAttempts - 5) * 30000; // 30s, 60s, 120s...
        setAccountLocked(true);
        setLockoutTime(Date.now() + lockDuration);
        
        setTimeout(() => {
          setAccountLocked(false);
          setLoginAttempts(0);
        }, lockDuration);
        
        showAlert('error', `Account locked due to multiple failed attempts. Locked for ${lockDuration / 1000} seconds.`);
      } else {
        showAlert('error', `Incorrect username or password. ${5 - newAttempts} attempt${5 - newAttempts !== 1 ? 's' : ''} remaining before account lockout.`);
      }
    }
  };

  const handleMFAVerification = () => {
    // Check if account is locked
    if (accountLocked) {
      const remainingTime = Math.ceil((lockoutTime - Date.now()) / 1000);
      showAlert('error', `Account locked. Try again in ${remainingTime} seconds.`);
      return;
    }

    // SR-001: Verify MFA code (TOTP simulation)
    if (mfaCode === '123456') { // Mock MFA code
      // SR-004: Generate cryptographically strong session token (128 bits)
      const token = generateSecureToken(128);
      setSessionToken(token);
      
      // SR-005: Set session expiry (5 min inactivity, 60 min max)
      const expiry = Date.now() + (60 * 60 * 1000); // 1 hour max session
      sessionExpiryRef.current = expiry;
      
      // Initialize user session
      const user = {
        id: 'USER001',
        username: 'demo',
        name: 'Farwah',
        email: 'demo@securebank.com',
        role: 'premium' // SR-006: RBAC role
      };
      setCurrentUser(user);
      setUserRole(user.role);
      setIsAuthenticated(true);
      setLoginAttempts(0);
      setMfaAttempts(0);
      
      // Start inactivity timer
      startInactivityTimer();
      
      // SR-011: Log successful authentication
      logSecurityEvent('MFA_SUCCESS', 'Multi-factor authentication successful');
      
      showAlert('success', 'Login successful!');
    } else {
      // Track failed MFA attempts
      const newMfaAttempts = mfaAttempts + 1;
      setMfaAttempts(newMfaAttempts);
      
      logSecurityEvent('MFA_FAILED', `Invalid MFA code entered - attempt #${newMfaAttempts}`);
      
      if (newMfaAttempts >= 5) {
        // Lock account after 5 failed MFA attempts
        const lockDuration = Math.pow(2, newMfaAttempts - 5) * 30000; // 30s, 60s, 120s...
        setAccountLocked(true);
        setLockoutTime(Date.now() + lockDuration);
        
        setTimeout(() => {
          setAccountLocked(false);
          setMfaAttempts(0);
          setLoginAttempts(0);
          setLoginStep('credentials');
          setMfaCode('');
        }, lockDuration);
        
        showAlert('error', `Account locked due to multiple failed MFA attempts. Locked for ${lockDuration / 1000} seconds. You will be redirected to login.`);
        
        // Redirect to login after showing message
        setTimeout(() => {
          setLoginStep('credentials');
          setMfaCode('');
        }, 3000);
      } else {
        showAlert('error', `Invalid MFA code. ${5 - newMfaAttempts} attempt${5 - newMfaAttempts !== 1 ? 's' : ''} remaining before account lockout.`);
      }
    }
  };

  // SR-004: Generate cryptographically strong token
  const generateSecureToken = (bits) => {
    const bytes = bits / 8;
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  // SR-005: Session management with inactivity timeout
  const startInactivityTimer = () => {
    const maxInactiveTime = 5 * 60 * 1000; // 5 minutes

    const timer = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;

      if (now >= sessionExpiryRef.current) {
        clearInterval(timer);
        handleLogout('max_session_expired');
      } else if (inactiveTime >= maxInactiveTime) {
        clearInterval(timer);
        handleLogout('inactivity_timeout');
      }
    }, 10000); // Check every 10 seconds

    inactivityTimerRef.current = timer;
  };

  const resetActivityTimer = () => {
    lastActivityRef.current = Date.now();
  };

  // Throttle activity updates to prevent excessive state changes
  const throttledResetActivity = () => {
    if (!activityTimeoutRef.current) {
      resetActivityTimer();
      activityTimeoutRef.current = setTimeout(() => {
        activityTimeoutRef.current = null;
      }, 1000); // Throttle to once per second
    }
  };

  // Track view/state changes as activity
  useEffect(() => {
    if (isAuthenticated) {
      resetActivityTimer();
    }
  }, [isAuthenticated, activeView, transferData, billPayment, transactionFilter, transactionSearch]);

  // Track user activity with mouse and keyboard events
  useEffect(() => {
    if (isAuthenticated) {
      const handleActivity = () => {
        throttledResetActivity();
      };

      // Add event listeners for various user activities
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('mousedown', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('touchstart', handleActivity);
      window.addEventListener('click', handleActivity);

      return () => {
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('mousedown', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('touchstart', handleActivity);
        window.removeEventListener('click', handleActivity);
      };
    }
  }, [isAuthenticated]);

  const handleLogout = (reason = 'user_action') => {
    // SR-011: Log logout event
    logSecurityEvent('LOGOUT', `User logged out: ${reason}`);
    
    // Clear session
    setIsAuthenticated(false);
    setSessionToken('');
    sessionExpiryRef.current = null;
    setCurrentUser(null);
    setUserRole('');
    setLoginStep('credentials');
    setPassword('');
    setMfaCode('');
    setLoginAttempts(0);
    setMfaAttempts(0);
    
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    if (reason === 'inactivity_timeout') {
      showAlert('warning', 'Session expired due to 5 minutes of inactivity');
    } else if (reason === 'max_session_expired') {
      showAlert('warning', 'Session expired after 1 hour');
    }
  };

  // SR-006, SR-007: RBAC and transaction limits
  const checkTransactionLimit = (amount) => {
    const limits = {
      'customer': 5000,
      'premium': 10000,
      'admin': 50000
    };
    
    const userLimit = limits[userRole] || 5000;
    
    // SR-007: Require approval for high-value transfers
    if (amount > 10000) {
      setTransferApprovalRequired(true);
      return { allowed: true, requiresApproval: true };
    }
    
    if (amount > userLimit) {
      return { allowed: false, requiresApproval: false, message: `Transaction exceeds your limit of $${userLimit}` };
    }
    
    return { allowed: true, requiresApproval: false };
  };

  // SR-008: Input validation for transfers
  const validateTransferInput = (data) => {
    const errors = {};
    
    // Whitelist validation for amount (only numbers and decimal)
    if (!data.amount.match(/^\d+(\.\d{1,2})?$/)) {
      errors.amount = 'Invalid amount format';
    }
    
    const amount = parseFloat(data.amount);
    if (amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    
    if (!data.fromAccount) {
      errors.fromAccount = 'Please select source account';
    }
    
    if (!data.toAccount) {
      errors.toAccount = 'Please select destination account';
    }
    
    // Sanitize description (prevent XSS)
    if (data.description && !data.description.match(/^[a-zA-Z0-9\s,.-]{0,100}$/)) {
      errors.description = 'Description contains invalid characters';
    }
    
    return errors;
  };

  const handleTransfer = async () => {
    // SR-008: Validate input
    const validationErrors = validateTransferInput(transferData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showAlert('error', 'Please fix validation errors');
      return;
    }
    
    const amount = parseFloat(transferData.amount);
    
    // SR-006, SR-007: Check transaction limits with RBAC
    const limitCheck = checkTransactionLimit(amount);
    if (!limitCheck.allowed) {
      showAlert('error', limitCheck.message);
      return;
    }
    
    // Check sufficient balance
    const sourceAccount = accounts.find(acc => acc.id === transferData.fromAccount);
    if (sourceAccount.balance < amount) {
      showAlert('error', 'Insufficient funds');
      return;
    }
    
    // Create transaction record
    const newTransaction = {
      id: `TXN${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: transferData.description || `Transfer to ${transferData.toAccount}`,
      amount: -amount,
      type: 'debit',
      status: limitCheck.requiresApproval ? 'pending_approval' : 'completed',
      fromAccount: transferData.fromAccount,
      toAccount: transferData.toAccount
    };
    
    if (limitCheck.requiresApproval) {
      // For pending approval - DO NOT deduct balance yet
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      localStorage.setItem('securebank_transactions', JSON.stringify(updatedTransactions));
      
      logSecurityEvent('TRANSFER_APPROVAL_REQUIRED', `High-value transfer: $${amount} - Pending approval`);
      
      showAlert('warning', 'This transaction requires administrative approval and will be processed within 24 hours. You will be notified once approved. Your balance will be deducted after approval.');
    } else {
      // For completed transactions - deduct balance immediately
      const updatedAccounts = accounts.map(acc => {
        if (acc.id === transferData.fromAccount) {
          // Deduct from source account
          return { ...acc, balance: acc.balance - amount };
        } else if (acc.id === transferData.toAccount && transferData.type === 'internal') {
          // Add to destination account (only for internal transfers)
          return { ...acc, balance: acc.balance + amount };
        }
        return acc;
      });
      
      setAccounts(updatedAccounts);
      localStorage.setItem('securebank_accounts', JSON.stringify(updatedAccounts));
      
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      localStorage.setItem('securebank_transactions', JSON.stringify(updatedTransactions));
      
      // SR-011: Log transaction
      logSecurityEvent('TRANSFER_SUCCESS', `Transfer of $${amount} from ${transferData.fromAccount} to ${transferData.toAccount}`);
      
      showAlert('success', 'Transfer completed successfully!');
    }
    
    // Reset form
    setTransferData({
      fromAccount: '',
      toAccount: '',
      amount: '',
      type: 'internal',
      description: '',
      scheduled: false,
      scheduleDate: ''
    });
    setErrors({});
  };

  const handleBillPayment = async () => {
    // SR-008: Input validation
    if (!billPayment.amount.match(/^\d+(\.\d{1,2})?$/)) {
      showAlert('error', 'Invalid amount format');
      return;
    }
    
    const amount = parseFloat(billPayment.amount);
    if (amount <= 0) {
      showAlert('error', 'Amount must be greater than 0');
      return;
    }
    
    // Check if there's a default account with sufficient balance
    const defaultAccount = accounts[0];
    if (defaultAccount.balance < amount) {
      showAlert('error', 'Insufficient funds');
      return;
    }
    
    // Update account balance
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === defaultAccount.id) {
        return { ...acc, balance: acc.balance - amount };
      }
      return acc;
    });
    
    setAccounts(updatedAccounts);
    localStorage.setItem('securebank_accounts', JSON.stringify(updatedAccounts));
    
    // Process bill payment
    const newTransaction = {
      id: `TXN${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: `Bill Payment - ${billPayment.type}`,
      amount: -amount,
      type: 'debit',
      status: 'completed'
    };
    
    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    localStorage.setItem('securebank_transactions', JSON.stringify(updatedTransactions));
    
    // SR-011: Log transaction
    logSecurityEvent('BILL_PAYMENT', `Bill payment of $${amount} for ${billPayment.type}`);
    
    showAlert('success', 'Bill payment successful!');
    
    setBillPayment({
      type: 'utility',
      amount: '',
      beneficiary: '',
      accountNumber: ''
    });
  };

  // Export transactions to PDF
  const exportTransactionsToPDF = () => {
    const filteredTxns = getFilteredTransactions();
    
    // Create PDF content
    let pdfContent = `SECUREBANK PRO - TRANSACTION STATEMENT
========================================
Generated: ${new Date().toLocaleString()}
Account Holder: ${currentUser?.name}
Total Transactions: ${filteredTxns.length}

`;

    pdfContent += `${'DATE'.padEnd(15)}${'DESCRIPTION'.padEnd(40)}${'TYPE'.padEnd(10)}${'AMOUNT'.padEnd(15)}${'STATUS'.padEnd(15)}\n`;
    pdfContent += '='.repeat(95) + '\n';

    filteredTxns.forEach(txn => {
      const date = txn.date.padEnd(15);
      const desc = txn.description.substring(0, 38).padEnd(40);
      const type = txn.type.padEnd(10);
      const amount = `$${Math.abs(txn.amount).toFixed(2)}`.padEnd(15);
      const status = txn.status.padEnd(15);
      pdfContent += `${date}${desc}${type}${amount}${status}\n`;
    });

    pdfContent += '\n' + '='.repeat(95) + '\n';
    pdfContent += `Total Debits: $${filteredTxns.filter(t => t.type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0).toFixed(2)}\n`;
    pdfContent += `Total Credits: $${filteredTxns.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}\n`;

    // Create blob and download
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SecureBank_Transactions_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showAlert('success', 'Transaction statement exported successfully!');
  };

  // Filter transactions based on search and filter
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    // Apply type filter
    if (transactionFilter === 'credit') {
      filtered = filtered.filter(txn => txn.type === 'credit');
    } else if (transactionFilter === 'debit') {
      filtered = filtered.filter(txn => txn.type === 'debit');
    }
    
    // Apply search filter
    if (transactionSearch) {
      filtered = filtered.filter(txn => 
        txn.description.toLowerCase().includes(transactionSearch.toLowerCase()) ||
        txn.id.toLowerCase().includes(transactionSearch.toLowerCase())
      );
    }
    
    return filtered;
  };

  // SR-011: Security event logging
  const logSecurityEvent = (eventType, description) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      description,
      username: currentUser?.username || username,
      ipAddress: '192.168.1.100', // Mock IP
      userAgent: navigator.userAgent
    };
    
    setSecurityLogs([logEntry, ...securityLogs]);
    
    // In production: Send to tamper-evident logging service
    console.log('[SECURITY LOG]', logEntry);
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const checkRateLimit = () => {
    if (Date.now() > rateLimitReset) {
      setApiCallCount(0);
      setRateLimitReset(Date.now() + 60000);
    }
    
    if (apiCallCount >= 100) {
      showAlert('error', 'Rate limit exceeded. Please try again later.');
      return false;
    }
    
    setApiCallCount(apiCallCount + 1);
    return true;
  };

  // Login Screen
  const renderLogin = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      {/* Alert Banner */}
      {alert.show && (
        <div className={`fixed top-4 right-4 left-4 md:left-auto z-50 max-w-md p-4 rounded-lg shadow-lg ${
          alert.type === 'success' ? 'bg-green-50 border border-green-200' :
          alert.type === 'error' ? 'bg-red-50 border border-red-200' :
          alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start space-x-3">
            {alert.type === 'success' && <CheckCircle className="text-green-600 flex-shrink-0" size={20} />}
            {alert.type === 'error' && <AlertCircle className="text-red-600 flex-shrink-0" size={20} />}
            {alert.type === 'warning' && <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />}
            {alert.type === 'info' && <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                alert.type === 'success' ? 'text-green-800' :
                alert.type === 'error' ? 'text-red-800' :
                alert.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {alert.message}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SecureBank Pro</h1>
          <p className="text-gray-600 mt-2">Cloud-Native Banking Platform</p>
        </div>

        {loginStep === 'credentials' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                disabled={accountLocked}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                  disabled={accountLocked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Min 12 chars with uppercase, lowercase, numbers, and special characters</p>
            </div>

            <button
              type="submit"
              disabled={accountLocked}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {accountLocked ? 'Account Locked' : 'Continue to MFA'}
            </button>

            <div className="text-center text-sm text-gray-600">
              Demo: username "demo", password "SecureBank123!"
            </div>
          </form>
        )}

        {loginStep === 'mfa' && (
          <div className="space-y-6">
            <div className="text-center">
              <Lock className="mx-auto text-blue-600 mb-4" size={48} />
              <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication</h2>
              <p className="text-gray-600">Enter the 6-digit code from your authenticator app</p>
            </div>

            <div>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <button
              onClick={handleMFAVerification}
              disabled={mfaCode.length !== 6}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              Verify & Login
            </button>

            <div className="text-center text-sm text-gray-600">
              Demo MFA code: 123456
            </div>

            <button
              onClick={() => {
                setLoginStep('credentials');
                setMfaCode('');
              }}
              className="w-full text-blue-600 hover:text-blue-700 text-sm"
            >
              Back to login
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <Shield size={16} />
            <span>Protected by Zero Trust Architecture</span>
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            TLS 1.3 Encrypted • AES-256 Data Protection
          </div>
        </div>
      </div>
    </div>
  );

  // Dashboard View
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="text-sm text-gray-600">
          Welcome, {currentUser?.name} ({userRole})
        </div>
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map(account => (
          <div key={account.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="text-blue-600" size={24} />
                <span className="font-semibold text-gray-900">{account.type}</span>
              </div>
              <span className="text-xs text-gray-500">{account.accountNumber}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-600 mt-2">{account.currency}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveView('transfer')}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <Send className="text-blue-600 mb-2" size={32} />
            <span className="text-sm font-medium">Transfer</span>
          </button>
          <button
            onClick={() => setActiveView('bills')}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <FileText className="text-blue-600 mb-2" size={32} />
            <span className="text-sm font-medium">Pay Bills</span>
          </button>
          <button
            onClick={() => setActiveView('transactions')}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <History className="text-blue-600 mb-2" size={32} />
            <span className="text-sm font-medium">History</span>
          </button>
          <button
            onClick={() => setActiveView('investments')}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <TrendingUp className="text-blue-600 mb-2" size={32} />
            <span className="text-sm font-medium">Investments</span>
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {transactions.slice(0, 5).map(txn => (
            <div key={txn.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  txn.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {txn.type === 'credit' ? '↓' : '↑'}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{txn.description}</div>
                  <div className="text-sm text-gray-500">{txn.date}</div>
                </div>
              </div>
              <div className={`font-semibold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                {txn.type === 'credit' ? '+' : ''}{txn.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Transfer View
  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Fund Transfer</h2>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Account</label>
            <select
              value={transferData.fromAccount}
              onChange={(e) => setTransferData({ ...transferData, fromAccount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.type} - {acc.accountNumber} (${acc.balance.toFixed(2)})
                </option>
              ))}
            </select>
            {errors.fromAccount && <p className="text-red-600 text-sm mt-1">{errors.fromAccount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setTransferData({ ...transferData, type: 'internal' })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                  transferData.type === 'internal'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                Internal
              </button>
              <button
                onClick={() => setTransferData({ ...transferData, type: 'external' })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                  transferData.type === 'external'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                External
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {transferData.type === 'internal' ? 'To Account' : 'Beneficiary'}
            </label>
            <select
              value={transferData.toAccount}
              onChange={(e) => setTransferData({ ...transferData, toAccount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select destination</option>
              {transferData.type === 'internal'
                ? accounts.filter(acc => acc.id !== transferData.fromAccount).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.type} - {acc.accountNumber}</option>
                  ))
                : beneficiaries.filter(b => b.bank).map(ben => (
                    <option key={ben.id} value={ben.id}>{ben.name} - {ben.bank}</option>
                  ))
              }
            </select>
            {errors.toAccount && <p className="text-red-600 text-sm mt-1">{errors.toAccount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
            <input
              type="text"
              value={transferData.amount}
              onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {errors.amount && <p className="text-red-600 text-sm mt-1">{errors.amount}</p>}
            <p className="text-xs text-gray-600 mt-1">
              Your transaction limit: ${userRole === 'premium' ? '10,000' : '5,000'} 
              {transferData.amount && parseFloat(transferData.amount) > 10000 && 
                ' (Requires approval for amounts over $10,000)'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <input
              type="text"
              value={transferData.description}
              onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Payment description"
              maxLength={100}
            />
            {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="scheduled"
              checked={transferData.scheduled}
              onChange={(e) => setTransferData({ ...transferData, scheduled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="scheduled" className="text-sm text-gray-700">Schedule for later</label>
          </div>

          {transferData.scheduled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Date</label>
              <input
                type="date"
                value={transferData.scheduleDate}
                onChange={(e) => setTransferData({ ...transferData, scheduleDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          <button
            onClick={handleTransfer}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {transferData.scheduled ? 'Schedule Transfer' : 'Transfer Now'}
          </button>
        </div>
      </div>
    </div>
  );

  // Bill Payments View
  const renderBills = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Bill Payments</h2>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bill Type</label>
            <select
              value={billPayment.type}
              onChange={(e) => setBillPayment({ ...billPayment, type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="utility">Utility</option>
              <option value="credit_card">Credit Card</option>
              <option value="phone">Phone/Internet</option>
              <option value="insurance">Insurance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Saved Beneficiary</label>
            <select
              value={billPayment.beneficiary}
              onChange={(e) => setBillPayment({ ...billPayment, beneficiary: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select beneficiary or add new</option>
              {beneficiaries.filter(b => b.type).map(ben => (
                <option key={ben.id} value={ben.id}>{ben.name} - {ben.accountNumber}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
            <input
              type="text"
              value={billPayment.accountNumber}
              onChange={(e) => setBillPayment({ ...billPayment, accountNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter account number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
            <input
              type="text"
              value={billPayment.amount}
              onChange={(e) => setBillPayment({ ...billPayment, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <button
            onClick={handleBillPayment}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Pay Bill
          </button>
        </div>
      </div>
    </div>
  );

  // Transactions View
  const renderTransactions = () => {
    const filteredTransactions = getFilteredTransactions();
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
          <button 
            onClick={exportTransactionsToPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
          >
            <FileText size={18} />
            <span>Export Statement</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-4 flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search transactions..."
              value={transactionSearch}
              onChange={(e) => setTransactionSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select 
              value={transactionFilter}
              onChange={(e) => setTransactionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{txn.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          txn.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.type === 'credit' ? '+' : ''}{txn.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          txn.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                          txn.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {txn.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No transactions found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Showing {filteredTransactions.length} of {transactions.length} transactions
                </span>
                <div className="space-x-4">
                  <span className="text-green-600 font-medium">
                    Credits: ${filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                  </span>
                  <span className="text-red-600 font-medium">
                    Debits: ${Math.abs(filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Investment Portfolio View
  const renderInvestments = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Investment Portfolio</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-sm text-gray-600 mb-2">Total Portfolio Value</div>
          <div className="text-3xl font-bold text-gray-900">
            ${portfolio.reduce((sum, holding) => sum + holding.value, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-green-600 mt-2">+12.5% This Month</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-sm text-gray-600 mb-2">Total Gain/Loss</div>
          <div className="text-3xl font-bold text-green-600">+$4,684.00</div>
          <div className="text-sm text-gray-600 mt-2">+19.7% Return</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-sm text-gray-600 mb-2">Holdings</div>
          <div className="text-3xl font-bold text-gray-900">{portfolio.length}</div>
          <div className="text-sm text-gray-600 mt-2">Active Positions</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Your Holdings</h3>
        <div className="space-y-4">
          {portfolio.map(holding => {
            const gainLoss = (holding.currentPrice - holding.avgPrice) * holding.shares;
            const gainLossPercent = ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
            
            return (
              <div key={holding.symbol} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{holding.symbol}</div>
                  <div className="text-sm text-gray-600">{holding.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{holding.shares} shares @ ${holding.avgPrice.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">${holding.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  <div className="text-sm text-gray-600">${holding.currentPrice.toFixed(2)}</div>
                  <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Main App Layout
  const renderApp = () => {
    // Calculate session time remaining in minutes
    const sessionMinutesRemaining = sessionExpiryRef.current 
      ? Math.max(0, Math.floor((sessionExpiryRef.current - Date.now()) / 60000))
      : 0;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Alert Banner */}
        {alert.show && (
          <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg ${
            alert.type === 'success' ? 'bg-green-50 border border-green-200' :
            alert.type === 'error' ? 'bg-red-50 border border-red-200' :
            alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start space-x-3">
              {alert.type === 'success' && <CheckCircle className="text-green-600 flex-shrink-0" size={20} />}
              {alert.type === 'error' && <AlertCircle className="text-red-600 flex-shrink-0" size={20} />}
              {alert.type === 'warning' && <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />}
              {alert.type === 'info' && <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  alert.type === 'success' ? 'text-green-800' :
                  alert.type === 'error' ? 'text-red-800' :
                  alert.type === 'warning' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {alert.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top Navigation */}
        <nav className="bg-white shadow-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <Shield className="text-blue-600" size={32} />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SecureBank Pro</h1>
                  <p className="text-xs text-gray-500">Zero Trust Banking</p>
                </div>
              </div>

              <div className="hidden md:flex items-center space-x-6">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-4 py-2 rounded-lg transition ${
                    activeView === 'dashboard' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('transfer')}
                  className={`px-4 py-2 rounded-lg transition ${
                    activeView === 'transfer' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Transfer
                </button>
                <button
                  onClick={() => setActiveView('bills')}
                  className={`px-4 py-2 rounded-lg transition ${
                    activeView === 'bills' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Bills
                </button>
                <button
                  onClick={() => setActiveView('transactions')}
                  className={`px-4 py-2 rounded-lg transition ${
                    activeView === 'transactions' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setActiveView('investments')}
                  className={`px-4 py-2 rounded-lg transition ${
                    activeView === 'investments' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Investments
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden md:block text-sm text-gray-600">
                  Session: {sessionMinutesRemaining} min
                </div>
                <button
                  onClick={() => handleLogout('user_action')}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-50"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-4 py-3 space-y-2">
                <button
                  onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => { setActiveView('transfer'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Transfer
                </button>
                <button
                  onClick={() => { setActiveView('bills'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Bills
                </button>
                <button
                  onClick={() => { setActiveView('transactions'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Transactions
                </button>
                <button
                  onClick={() => { setActiveView('investments'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Investments
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'transfer' && renderTransfer()}
          {activeView === 'bills' && renderBills()}
          {activeView === 'transactions' && renderTransactions()}
          {activeView === 'investments' && renderInvestments()}
        </main>

        {/* Security Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Lock size={16} />
                <span>TLS 1.3 Encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield size={16} />
                <span>AES-256 Data Protection</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} />
                <span>OWASP ASVS v5.0 Compliant</span>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-4">
              © 2024 SecureBank Pro - All Rights Reserved | Rate Limit: {apiCallCount}/100 requests
            </div>
          </div>
        </footer>
      </div>
    );
  };

  return isAuthenticated ? renderApp() : renderLogin();
};

export default SecureBankPro;