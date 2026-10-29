const FAQ: [string, string][] = [
  ['How does mentorship work?', 'Send a “Mentor me” request. If the person accepts, they set how long the mentorship runs (1, 2 or 3 months). You’ll both be reminded a week before it ends so it can be renewed or finished.'],
  ['Who can see my posts?', 'Regular posts are visible to your direct mentors and mentees and to their own mentors and mentees (2 layers). Global Posts are visible to everyone.'],
  ['What is a Global Post?', 'One of your posts that you mark as global. You can only have one at a time and it must stay global for at least a week. A removed Global Post is kept as a draft you can restore from your profile.'],
  ['What are Reflections and Noted?', 'A Reflection is like a quote repost: you add your own thoughts to a post that deeply resonated with you, and your reflection appears with the original post inside it. Normal posts follow the 2-layer rule; Global Posts and their reflections are open to everyone. Noted saves a post privately for yourself.'],
  ['How do direct messages work?', 'Only mentors and mentees can message each other. Choose General (unlimited), Important or Emergency (both limited each month) before you send.'],
  ['What do grades mean?', 'Anyone can rate anyone with a thumbs up or down. Your rating is ups minus downs. Only you see the exact number; everyone else sees your grade, from E up to A. The bar for each grade scales with the size of the community so grades stay fair as Exclusive grows. Tap a grade on any profile to see today’s levels.'],
]

export default function Help() {
  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 500 }}>Help Center</h2>
      {FAQ.map(([q, a]) => (
        <details key={q} style={{ borderTop: '.5px solid var(--n200)', padding: '14px 0' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>{q}</summary>
          <p className="sub" style={{ fontSize: 15, margin: '8px 0 0' }}>{a}</p>
        </details>
      ))}
    </div>
  )
}
