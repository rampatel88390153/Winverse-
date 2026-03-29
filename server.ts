import express from 'express';
import next from 'next';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Read config
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Initialize Firebase Admin
initializeApp({
  projectId: config.projectId,
});
const db = getFirestore(config.firestoreDatabaseId);

const PORT = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();

  server.use(express.json());

  // --- GAME ENGINE ---
  let currentRoundId = '';
  let timer = 30;
  let status = 'betting'; // betting, locked, calculating
  let mode = 'random'; // random, manual, lowest_bet
  let manualResult = '';

  const startNewRound = async () => {
    currentRoundId = Date.now().toString();
    timer = 30;
    status = 'betting';
    manualResult = '';
    
    await db.collection('system').doc('game_state').set({
      current_round_id: currentRoundId,
      timer,
      status,
      mode,
      manual_result: manualResult
    });
  };

  const resolveRound = async () => {
    status = 'calculating';
    await db.collection('system').doc('game_state').update({ status, timer: 0 });

    // Fetch all bets for this round
    const betsSnapshot = await db.collection('bets').where('round_id', '==', currentRoundId).get();
    const bets = betsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    let result = '';
    const options = ['Red', 'Green', 'Blue', 'Big', 'Small'];

    if (mode === 'manual' && manualResult) {
      result = manualResult;
    } else if (mode === 'lowest_bet' && bets.length > 0) {
      const totals: Record<string, number> = { Red: 0, Green: 0, Blue: 0, Big: 0, Small: 0 };
      bets.forEach(b => {
        totals[b.option as string] += (b.amount as number);
      });
      
      let lowestOption = 'Red';
      let lowestAmount = Infinity;
      
      // Tie priority: Red > Green > Blue > Big > Small
      for (const opt of options) {
        if (totals[opt] < lowestAmount) {
          lowestAmount = totals[opt];
          lowestOption = opt;
        }
      }
      result = lowestAmount === Infinity ? options[Math.floor(Math.random() * options.length)] : lowestOption;
    } else {
      // Random
      result = options[Math.floor(Math.random() * options.length)];
    }

    // Save round result
    await db.collection('rounds').doc(currentRoundId).set({
      round_id: currentRoundId,
      result,
      timestamp: Date.now()
    });

    // Process bets
    if (bets.length > 0) {
      const batch = db.batch();
      for (const bet of bets) {
        const betRef = db.collection('bets').doc(bet.id);
        const userRef = db.collection('users').doc(bet.user_id as string);
        
        if (bet.option === result) {
          const winAmount = (bet.amount as number) * 1.9;
          batch.update(betRef, { status: 'win' });
          batch.update(userRef, { balance: FieldValue.increment(winAmount) });
        } else {
          batch.update(betRef, { status: 'lose' });
        }
      }
      await batch.commit();
    }

    // Start next round
    setTimeout(startNewRound, 2000); // 2s delay before next round starts
  };

  // Game Loop
  setInterval(async () => {
    if (!currentRoundId) return;

    if (timer > 0) {
      timer--;
      if (timer === 10) {
        status = 'locked';
      }
      
      // Only update DB every 1s
      await db.collection('system').doc('game_state').update({
        timer,
        status
      }).catch(console.error);
    } else if (timer === 0 && status !== 'calculating') {
      await resolveRound();
    }
  }, 1000);

  // Initialize first round
  startNewRound();

  // --- ADMIN API ROUTES ---
  server.post('/api/admin/mode', async (req, res) => {
    const { newMode } = req.body;
    if (['random', 'manual', 'lowest_bet'].includes(newMode)) {
      mode = newMode;
      await db.collection('system').doc('game_state').update({ mode });
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid mode' });
    }
  });

  server.post('/api/admin/manual-result', async (req, res) => {
    const { result } = req.body;
    manualResult = result;
    await db.collection('system').doc('game_state').update({ manual_result: result });
    res.json({ success: true });
  });

  // Next.js request handler
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
