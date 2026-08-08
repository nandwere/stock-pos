// lib/scheduler.ts — import this once from your app's entry point (e.g. instrumentation.ts)
import cron from 'node-cron';

export function startScheduler() {
  cron.schedule('0 8 * * *', async () => {
    await fetch(`${process.env.APP_URL}/api/cron/credit-reminders`, {
      headers: { 'x-cron-secret': process.env.CRON_SECRET! },
    });
  });
}