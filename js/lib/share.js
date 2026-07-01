// ===== Shareable test links =====
// A whole quiz is compressed into the URL itself (LZString → URL-safe string),
// so a teacher can share a test with a single link and NO backend or account.
// The student opens the link, takes it in the browser, and gets graded instantly.
// (Optional Supabase-backed short links & result collection can layer on later.)

export function encodeQuiz(quiz) {
  const json = JSON.stringify(slim(quiz));
  return window.LZString.compressToEncodedURIComponent(json);
}

export function decodeQuiz(str) {
  try {
    const json = window.LZString.decompressFromEncodedURIComponent(str);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

export function shareUrl(quiz) {
  const data = encodeQuiz(quiz);
  return `${location.origin}${location.pathname}#/take/${data}`;
}

// keep only what the player needs, to shrink the URL
function slim(quiz) {
  return {
    t: quiz.title,
    q: quiz.questions.map((q) => ({
      i: q.id, y: q.type, s: q.stem,
      c: (q.choices || []).map((c) => [c.text, c.correct ? 1 : 0]),
      a: q.answers || [], p: q.points ?? 1,
    })),
  };
}

export function unslim(data) {
  return {
    title: data.t || 'Shared Assessment',
    questions: (data.q || []).map((q) => ({
      id: q.i, type: q.y, stem: q.s,
      choices: (q.c || []).map(([text, correct]) => ({ text, correct: !!correct })),
      answers: q.a || [], points: q.p ?? 1,
    })),
  };
}
