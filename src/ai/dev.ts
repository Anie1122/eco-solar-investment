'use server';
import { config } from 'dotenv';
config({ path: '.env' });

import '@/ai/flows/investment-chat-flow.ts';
import '@/ai/flows/personalized-investment-suggestions.ts';
