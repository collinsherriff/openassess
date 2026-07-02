// ===== Sample question bank =====
// Seeds the item bank with a realistic spread of subjects, types and metadata
// so every tool is explorable in one click. Idempotent: skips if already seeded.
import { Store } from './store.js';
import { makeQuestion } from './model.js';

const FLAG = 'openassess.demo.seeded';

const SAMPLES = [
  // --- Biology ---
  { type: 'mc', stem: 'Which organelle is responsible for producing most of a cell’s ATP?', subject: 'Biology', difficulty: 'Easy', bloom: 'Remember', tags: ['cells'],
    choices: [{ text: 'Nucleus' }, { text: 'Mitochondrion', correct: true }, { text: 'Ribosome' }, { text: 'Golgi apparatus' }] },
  { type: 'mc', stem: 'During photosynthesis, plants convert light energy into which form of chemical energy?', subject: 'Biology', difficulty: 'Medium', bloom: 'Understand', tags: ['photosynthesis'],
    choices: [{ text: 'Glucose', correct: true }, { text: 'Oxygen' }, { text: 'Carbon dioxide' }, { text: 'Chlorophyll' }] },
  { type: 'tf', stem: 'Osmosis is the diffusion of water across a selectively permeable membrane.', subject: 'Biology', difficulty: 'Easy', bloom: 'Remember', tags: ['cells'],
    choices: [{ text: 'True', correct: true }, { text: 'False' }] },
  { type: 'short', stem: 'What pigment gives plant leaves their green color?', subject: 'Biology', difficulty: 'Easy', bloom: 'Remember', tags: ['photosynthesis'], answers: ['chlorophyll'] },
  { type: 'multi', stem: 'Which of the following are found in plant cells but NOT in animal cells? (Select all that apply.)', subject: 'Biology', difficulty: 'Medium', bloom: 'Analyze', tags: ['cells'],
    choices: [{ text: 'Cell wall', correct: true }, { text: 'Chloroplast', correct: true }, { text: 'Mitochondrion' }, { text: 'Cell membrane' }] },
  // --- Math ---
  { type: 'mc', stem: 'What is the value of 7 × 8?', subject: 'Math', difficulty: 'Easy', bloom: 'Remember', tags: ['multiplication'],
    choices: [{ text: '54' }, { text: '56', correct: true }, { text: '63' }, { text: '48' }] },
  { type: 'mc', stem: 'Which fraction is equivalent to 0.75?', subject: 'Math', difficulty: 'Medium', bloom: 'Apply', tags: ['fractions'],
    choices: [{ text: '3/4', correct: true }, { text: '2/3' }, { text: '4/5' }, { text: '7/10' }] },
  { type: 'short', stem: 'Solve for x: 2x + 6 = 20', subject: 'Math', difficulty: 'Medium', bloom: 'Apply', tags: ['algebra'], answers: ['7', 'x=7', 'x = 7'] },
  { type: 'tf', stem: 'A triangle can have two right angles.', subject: 'Math', difficulty: 'Medium', bloom: 'Understand', tags: ['geometry'],
    choices: [{ text: 'True' }, { text: 'False', correct: true }] },
  // --- History ---
  { type: 'mc', stem: 'In what year did the United States declare independence?', subject: 'History', difficulty: 'Easy', bloom: 'Remember', tags: ['american-revolution'],
    choices: [{ text: '1776', correct: true }, { text: '1789' }, { text: '1765' }, { text: '1812' }] },
  { type: 'mc', stem: 'The assassination of Archduke Franz Ferdinand is most directly associated with the start of which conflict?', subject: 'History', difficulty: 'Medium', bloom: 'Understand', tags: ['wwi'],
    choices: [{ text: 'World War I', correct: true }, { text: 'World War II' }, { text: 'The Crimean War' }, { text: 'The Franco-Prussian War' }] },
  { type: 'essay', stem: 'Explain two causes of the Industrial Revolution and how they reinforced each other.', subject: 'History', difficulty: 'Hard', bloom: 'Analyze', tags: ['industrial-revolution'] },
  // --- English ---
  { type: 'mc', stem: 'Which of these is an example of a metaphor?', subject: 'English', difficulty: 'Medium', bloom: 'Analyze', tags: ['figurative-language'],
    choices: [{ text: 'The classroom was a zoo.', correct: true }, { text: 'She runs like the wind.' }, { text: 'The wind whispered.' }, { text: 'Boom! The door slammed.' }] },
  { type: 'short', stem: 'What is the term for the perspective from which a story is told?', subject: 'English', difficulty: 'Easy', bloom: 'Remember', tags: ['literary-terms'], answers: ['point of view', 'pov'] },
  { type: 'fib', stem: 'A word that has the same meaning as another word is called a ______.', subject: 'English', difficulty: 'Easy', bloom: 'Remember', tags: ['vocabulary'], answers: ['synonym'] },
  // --- Geography / science mix ---
  { type: 'mc', stem: 'Which layer of Earth lies directly beneath the crust?', subject: 'Earth Science', difficulty: 'Easy', bloom: 'Remember', tags: ['earth-layers'],
    choices: [{ text: 'The mantle', correct: true }, { text: 'The outer core' }, { text: 'The inner core' }, { text: 'The lithosphere' }] },
  { type: 'tf', stem: 'Water covers roughly 70% of Earth’s surface.', subject: 'Earth Science', difficulty: 'Easy', bloom: 'Remember', tags: ['oceans'],
    choices: [{ text: 'True', correct: true }, { text: 'False' }] },
  { type: 'mc', stem: 'What causes Earth’s seasons?', subject: 'Earth Science', difficulty: 'Hard', bloom: 'Understand', tags: ['astronomy'],
    choices: [{ text: 'The tilt of Earth’s axis', correct: true }, { text: 'The distance from the sun' }, { text: 'The speed of Earth’s rotation' }, { text: 'Ocean currents' }] },
];

export function seed() {
  if (localStorage.getItem(FLAG) && Store.count() > 0) return 0;
  const n = Store.addMany(SAMPLES.map((s) => makeQuestion({ ...s, source: 'Sample bank' })));
  localStorage.setItem(FLAG, '1');
  return n;
}
