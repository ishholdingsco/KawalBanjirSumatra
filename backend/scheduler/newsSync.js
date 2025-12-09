const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Execute Python news scraping script
 */
async function runNewsScraping() {
  return new Promise((resolve, reject) => {
    console.log('📰 [NEWS-SYNC] Starting news scraping...');
    console.log(`📅 [NEWS-SYNC] Sync time: ${new Date().toLocaleString('id-ID')}`);

    // Path to Python script and virtual environment
    const scriptPath = path.join(__dirname, '../scripts/scrape-news.py');
    const venvPython = path.join(__dirname, '../scripts/venv/bin/python');

    // Use venv python if exists, otherwise fall back to system python3
    const fs = require('fs');
    const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';

    // Spawn Python process
    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });

    let outputData = '';
    let errorData = '';

    // Capture stdout
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      outputData += output;
      // Print to console in real-time
      process.stdout.write(output);
    });

    // Capture stderr
    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      errorData += error;
      process.stderr.write(error);
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ [NEWS-SYNC] News scraping completed successfully!');
        resolve({ success: true, output: outputData });
      } else {
        console.error(`❌ [NEWS-SYNC] News scraping failed with code ${code}`);
        if (errorData) {
          console.error('Error details:', errorData);
        }
        reject(new Error(`Python script exited with code ${code}`));
      }
    });

    // Handle errors
    pythonProcess.on('error', (error) => {
      console.error('❌ [NEWS-SYNC] Error spawning Python process:', error);
      reject(error);
    });
  });
}

/**
 * Start news scraping scheduler
 * Runs every 6 hours
 */
function startNewsSyncScheduler() {
  // Run every 6 hours
  // Cron format: second minute hour day month weekday
  // '0 0 */6 * * *' = Every 6 hours (at 00:00, 06:00, 12:00, 18:00)

  const schedule = '0 0 */6 * * *'; // Every 6 hours

  console.log('⏰ News Scraping Auto-Sync Scheduler started');
  console.log('   Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00 WIB)');
  console.log(`   Next sync: ${getNextScheduleTime()}`);

  cron.schedule(schedule, async () => {
    console.log('\n🔔 NEWS SYNC CRON Job Triggered!');
    try {
      await runNewsScraping();
      console.log(`   Next sync: ${getNextScheduleTime()}\n`);
    } catch (error) {
      console.error('❌ [NEWS-SYNC] Cron job failed:', error);
    }
  }, {
    timezone: "Asia/Jakarta"
  });

  // Optional: Run immediately on server start (for testing)
  // Uncomment line below if you want to scrape immediately when server starts
  runNewsScraping().catch(err => console.error('Initial scraping failed:', err));
}

/**
 * Get next scheduled execution time
 */
function getNextScheduleTime() {
  const now = new Date();
  const hours = now.getHours();

  // Next sync times: 0, 6, 12, 18
  const nextHours = [0, 6, 12, 18].find(h => h > hours);

  const next = new Date(now);
  if (nextHours !== undefined) {
    next.setHours(nextHours, 0, 0, 0);
  } else {
    // If past 18:00, next is tomorrow at 00:00
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  }

  return next.toLocaleString('id-ID');
}

/**
 * Manual sync function (can be called via API)
 */
async function manualNewsSync() {
  console.log('🔄 Manual news sync triggered');
  return await runNewsScraping();
}

module.exports = {
  startNewsSyncScheduler,
  runNewsScraping,
  manualNewsSync
};
