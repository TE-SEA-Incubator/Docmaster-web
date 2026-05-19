import { SmsService } from '../services/sms.service.ts';
import dotenv from 'dotenv';

dotenv.config();

async function testSms() {
  const smsService = new SmsService();
  const testPhone = process.env.ORANGE_DEV_PHONE || '237697407380';
  
  console.log('🚀 Starting SMS Service Test...');
  console.log(`📱 Target Phone: ${testPhone}`);
  
  try {
    const success = await smsService.sendOtp(testPhone, '123456');
    if (success) {
      console.log('✅ TEST SUCCESS: SMS sent successfully!');
    } else {
      console.error('❌ TEST FAILED: SMS sending failed (Check logs/credentials).');
    }
  } catch (error: any) {
    console.error('💥 TEST CRASHED:', error.message);
  }
}

testSms();
