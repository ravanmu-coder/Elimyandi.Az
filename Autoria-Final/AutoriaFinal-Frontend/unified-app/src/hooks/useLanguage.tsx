import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'az' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys
const translations = {
  az: {
    // Navigation
    'nav.logo': 'Əlimyandı.az',
    'nav.search.placeholder': 'Marka, Model, Zərər, Rəng, VIN və s. daxil edin',
    'nav.search.button': 'Inventar axtar',
    'nav.register': 'Qeydiyyat',
    'nav.login': 'Daxil ol',
    'nav.welcome': 'Xoş gəlmisiniz',
    'nav.logout': 'Çıxış',
    
    // Role indicators
    'role.member': 'Üzv Portalı',
    'role.seller': 'Satıcı Portalı',
    'role.admin': 'Admin Portalı',
    
    // Main menu
    'menu.dashboard': 'Dashboard',
    'menu.howItWorks': 'Necə işləyir',
    'menu.inventory': 'İnventar',
    'menu.auctions': 'Hərraclar',
    'menu.bids': 'Təkliflər',
    'menu.payment': 'Ödəniş',
    'menu.addAdvertisement': 'Elan əlavə et',
    'menu.locations': 'Lokasiyalar',
    'menu.services': 'Xidmətlər və dəstək',
    
    // Dropdown menus
    'dropdown.vehicleFinder': 'Nəqliyyat tapıcısı',
    'dropdown.salesList': 'Satış siyahısı',
    'dropdown.todaysAuction': 'Bugünkü hərrac',
    'dropdown.auctionsCalendar': 'Hərrac təqvimi',
    'dropdown.joinAuction': 'Hərraca qoşul',
    'dropdown.myBids': 'Təkliflərim',
    'dropdown.aboutUs': 'Haqqımızda',
    'dropdown.sellYourCar': 'Avtomobilinizi satın',
    
    // Footer
    'footer.getToKnowUs': 'Bizi tanıyın',
    'footer.aboutUs': 'Haqqımızda',
    'footer.careers': 'Karyera',
    'footer.news': 'Xəbərlər',
    'footer.auctions': 'Hərraclar',
    'footer.todaysAuctions': 'Bugünkü hərraclar',
    'footer.auctionsCalendar': 'Hərrac təqvimi',
    'footer.joinAuction': 'Hərracda iştirak',
    'footer.nightSales': 'Gecə satışları',
    'footer.bankCars': 'Bank avtomobilləri',
    'footer.rentalAuctions': 'İcarə hərracları',
    'footer.wholesaleAuctions': 'Topdan hərraclar',
    'footer.featuredCars': 'Seçilmiş avtomobillər',
    'footer.support': 'Dəstək',
    'footer.helpCenter': 'Kömək mərkəzi',
    'footer.glossary': 'Terminlər lüğəti',
    'footer.resourceCenter': 'Resurs mərkəzi',
    'footer.licensingHelp': 'Lisenziya köməyi',
    'footer.videos': 'Videolar',
    'footer.membershipFees': 'Üzv haqları',
    'footer.mobileApps': 'Mobil tətbiqlər',
    'footer.newMemberGuide': 'Yeni üzv bələdçisi',
    'footer.contactUs': 'Bizimlə Əlaqə',
    'footer.copyright': '© 2024 Əlimyandı.az. Bütün hüquqlar qorunur.',
    
    // Language names
    'language.azerbaijani': 'Azərbaycan',
    'language.english': 'English',
    
    // Authentication pages
    'auth.login.title': 'Daxil ol',
    'auth.login.subtitle': 'Hesabınıza daxil olun',
    'auth.login.email': 'Email',
    'auth.login.password': 'Şifrə',
    'auth.login.rememberMe': 'Məni xatırla',
    'auth.login.forgotPassword': 'Şifrəni unutmusunuz?',
    'auth.login.signIn': 'Daxil ol',
    'auth.login.noAccount': 'Hesabınız yoxdur?',
    'auth.login.register': 'Qeydiyyatdan keçin',
    'auth.login.confirmEmail': 'Email təsdiqlənməsi tələb olunur',
    'auth.login.confirmEmailMessage': 'Email ünvanınızı təsdiqləmək üçün göndərilən linkə klikləyin.',
    
    'auth.register.title': 'Qeydiyyat',
    'auth.register.subtitle': 'Yeni hesab yaradın',
    'auth.register.firstName': 'Ad',
    'auth.register.lastName': 'Soyad',
    'auth.register.username': 'İstifadəçi adı',
    'auth.register.email': 'Email',
    'auth.register.password': 'Şifrə',
    'auth.register.confirmPassword': 'Şifrəni təsdiqlə',
    'auth.register.dateOfBirth': 'Doğum tarixi',
    'auth.register.phone': 'Telefon nömrəsi',
    'auth.register.isOver18': '18 yaşdan böyük olduğumu təsdiqləyirəm',
    'auth.register.role': 'Rol seçin',
    'auth.register.member': 'Üzv',
    'auth.register.seller': 'Satıcı',
    'auth.register.createAccount': 'Hesab yarat',
    'auth.register.haveAccount': 'Artıq hesabınız var?',
    'auth.register.signIn': 'Daxil olun',
    'auth.register.success.title': 'Qeydiyyat uğurlu!',
    'auth.register.success.message': 'Təsdiq emaili göndərildi',
    'auth.register.success.details': 'Email ünvanınızı təsdiqləmək üçün göndərilən linkə klikləyin.',
    'auth.register.success.countdown': 'Saniyə sonra login səhifəsinə yönləndiriləcəksiniz',
    
    'auth.forgotPassword.title': 'Şifrəni unutmusunuz?',
    'auth.forgotPassword.subtitle': 'Şifrə sıfırlama linkini alın',
    'auth.forgotPassword.email': 'Email',
    'auth.forgotPassword.sendReset': 'Sıfırlama linkini göndər',
    'auth.forgotPassword.backToLogin': 'Login səhifəsinə qayıt',
    'auth.forgotPassword.success.title': 'Email göndərildi!',
    'auth.forgotPassword.success.message': 'Şifrə sıfırlama linki email ünvanınıza göndərildi.',
    
    'auth.resetPassword.title': 'Şifrəni sıfırla',
    'auth.resetPassword.subtitle': 'Yeni şifrənizi daxil edin',
    'auth.resetPassword.password': 'Yeni şifrə',
    'auth.resetPassword.confirmPassword': 'Şifrəni təsdiqlə',
    'auth.resetPassword.resetPassword': 'Şifrəni sıfırla',
    'auth.resetPassword.success.title': 'Şifrə sıfırlandı!',
    'auth.resetPassword.success.message': 'Şifrəniz uğurla sıfırlandı.',
    'auth.resetPassword.success.login': 'Login səhifəsinə keç',
    
    'auth.confirmEmail.title': 'Email təsdiqlənməsi',
    'auth.confirmEmail.success': 'Email uğurla təsdiqləndi!',
    'auth.confirmEmail.redirecting': 'Login səhifəsinə yönləndirilirsiniz...',
    
    'auth.validation.required': 'Bu sahə tələb olunur',
    'auth.validation.email': 'Düzgün email ünvanı daxil edin',
    'auth.validation.password': 'Şifrə ən azı 8 simvol olmalıdır',
    'auth.validation.passwordMatch': 'Şifrələr uyğun gəlmir',
    'auth.validation.age': '18 yaşdan böyük olmalısınız',
    'auth.validation.phone': 'Düzgün telefon nömrəsi daxil edin',
  },
  en: {
    // Navigation
    'nav.logo': 'Əlimyandı.az',
    'nav.search.placeholder': 'Enter Brand, Model, Damage, Color, VIN, etc.',
    'nav.search.button': 'Search Inventory',
    'nav.register': 'Register',
    'nav.login': 'Sign In',
    'nav.welcome': 'Welcome',
    'nav.logout': 'Logout',
    
    // Role indicators
    'role.member': 'Member Portal',
    'role.seller': 'Seller Portal',
    'role.admin': 'Admin Portal',
    
    // Main menu
    'menu.dashboard': 'Dashboard',
    'menu.howItWorks': 'How It Works',
    'menu.inventory': 'Inventory',
    'menu.auctions': 'Auctions',
    'menu.bids': 'Bids',
    'menu.payment': 'Payment',
    'menu.addAdvertisement': 'Add Advertisement',
    'menu.locations': 'Locations',
    'menu.services': 'Services & Support',
    
    // Dropdown menus
    'dropdown.vehicleFinder': 'Vehicle Finder',
    'dropdown.salesList': 'Sales List',
    'dropdown.todaysAuction': 'Today\'s Auction',
    'dropdown.auctionsCalendar': 'Auctions Calendar',
    'dropdown.joinAuction': 'Join Auction',
    'dropdown.myBids': 'My Bids',
    'dropdown.aboutUs': 'About Us',
    'dropdown.sellYourCar': 'Sell Your Car',
    
    // Footer
    'footer.getToKnowUs': 'Get to Know Us',
    'footer.aboutUs': 'About Us',
    'footer.careers': 'Careers',
    'footer.news': 'News',
    'footer.auctions': 'Auctions',
    'footer.todaysAuctions': 'Today\'s Auctions',
    'footer.auctionsCalendar': 'Auctions Calendar',
    'footer.joinAuction': 'Join Auction',
    'footer.nightSales': 'Night Sales',
    'footer.bankCars': 'Bank Cars',
    'footer.rentalAuctions': 'Rental Auctions',
    'footer.wholesaleAuctions': 'Wholesale Auctions',
    'footer.featuredCars': 'Featured Cars',
    'footer.support': 'Support',
    'footer.helpCenter': 'Help Center',
    'footer.glossary': 'Glossary',
    'footer.resourceCenter': 'Resource Center',
    'footer.licensingHelp': 'Licensing Help',
    'footer.videos': 'Videos',
    'footer.membershipFees': 'Membership Fees',
    'footer.mobileApps': 'Mobile Apps',
    'footer.newMemberGuide': 'New Member Guide',
    'footer.contactUs': 'Contact Us',
    'footer.copyright': '© 2024 Əlimyandı.az. All rights reserved.',
    
    // Language names
    'language.azerbaijani': 'Azərbaycan',
    'language.english': 'English',
    
    // Authentication pages
    'auth.login.title': 'Sign In',
    'auth.login.subtitle': 'Sign in to your account',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.rememberMe': 'Remember me',
    'auth.login.forgotPassword': 'Forgot your password?',
    'auth.login.signIn': 'Sign In',
    'auth.login.noAccount': 'Don\'t have an account?',
    'auth.login.register': 'Register',
    'auth.login.confirmEmail': 'Email verification required',
    'auth.login.confirmEmailMessage': 'Please click the link sent to your email to verify your email address.',
    
    'auth.register.title': 'Register',
    'auth.register.subtitle': 'Create a new account',
    'auth.register.firstName': 'First Name',
    'auth.register.lastName': 'Last Name',
    'auth.register.username': 'Username',
    'auth.register.email': 'Email',
    'auth.register.password': 'Password',
    'auth.register.confirmPassword': 'Confirm Password',
    'auth.register.dateOfBirth': 'Date of Birth',
    'auth.register.phone': 'Phone Number',
    'auth.register.isOver18': 'I confirm that I am 18 years or older',
    'auth.register.role': 'Select Role',
    'auth.register.member': 'Member',
    'auth.register.seller': 'Seller',
    'auth.register.createAccount': 'Create Account',
    'auth.register.haveAccount': 'Already have an account?',
    'auth.register.signIn': 'Sign In',
    'auth.register.success.title': 'Registration Successful!',
    'auth.register.success.message': 'Confirmation Email Sent',
    'auth.register.success.details': 'Please click the link sent to your email to verify your email address.',
    'auth.register.success.countdown': 'You will be redirected to the login page in seconds',
    
    'auth.forgotPassword.title': 'Forgot Password?',
    'auth.forgotPassword.subtitle': 'Get password reset link',
    'auth.forgotPassword.email': 'Email',
    'auth.forgotPassword.sendReset': 'Send Reset Link',
    'auth.forgotPassword.backToLogin': 'Back to Login',
    'auth.forgotPassword.success.title': 'Email Sent!',
    'auth.forgotPassword.success.message': 'Password reset link has been sent to your email address.',
    
    'auth.resetPassword.title': 'Reset Password',
    'auth.resetPassword.subtitle': 'Enter your new password',
    'auth.resetPassword.password': 'New Password',
    'auth.resetPassword.confirmPassword': 'Confirm Password',
    'auth.resetPassword.resetPassword': 'Reset Password',
    'auth.resetPassword.success.title': 'Password Reset!',
    'auth.resetPassword.success.message': 'Your password has been successfully reset.',
    'auth.resetPassword.success.login': 'Go to Login',
    
    'auth.confirmEmail.title': 'Email Verification',
    'auth.confirmEmail.success': 'Email successfully verified!',
    'auth.confirmEmail.redirecting': 'Redirecting to login page...',
    
    'auth.validation.required': 'This field is required',
    'auth.validation.email': 'Please enter a valid email address',
    'auth.validation.password': 'Password must be at least 8 characters',
    'auth.validation.passwordMatch': 'Passwords do not match',
    'auth.validation.age': 'You must be 18 years or older',
    'auth.validation.phone': 'Please enter a valid phone number',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('az');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'az' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language to localStorage when changed
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
