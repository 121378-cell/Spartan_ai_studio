import i18n from '@/i18n/config';

async function testI18n() {
  console.log('Testing i18n functionality...');
  
  // Test default language (English)
  console.log('Default language (en):', i18n.t('welcome'));
  
  // Test Spanish
  await i18n.changeLanguage('es');
  console.log('Spanish:', i18n.t('welcome'));
  
  // Test French
  await i18n.changeLanguage('fr');
  console.log('French:', i18n.t('welcome'));
  
  // Test with parameters
  await i18n.changeLanguage('en');
  console.log('English with params:', i18n.t('greeting', { name: 'John' }));
  
  await i18n.changeLanguage('es');
  console.log('Spanish with params:', i18n.t('greeting', { name: 'Juan' }));
  
  await i18n.changeLanguage('fr');
  console.log('French with params:', i18n.t('greeting', { name: 'Jean' }));
  
  console.log('Available languages:', i18n.options.supportedLngs);
  console.log('i18n test completed!');
}

testI18n().catch(console.error);