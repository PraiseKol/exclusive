import { LEGAL } from '@/lib/legal'

export const metadata = { title: 'Privacy Policy · Exclusive' }

export default function Privacy() {
  const L = LEGAL
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="sub">Last updated: {L.updated}</p>
      <p>This policy explains what personal data {L.company} (“we”) collects through {L.product}, why, who sees it, and the choices you have. For your detailed rights under the Nigeria Data Protection Act 2023 (NDPA) and the EU/UK GDPR see our <a href="/data-protection">Data Protection Notice</a>.</p>

      <h2>1. Who is responsible for your data</h2>
      <p>{L.company}, {L.address}, is the data controller. Privacy contact: {L.privacyEmail}.</p>

      <h2>2. What we collect</h2>
      <ul>
        <li><b>Account details:</b> email address, password (stored securely hashed by our authentication provider), first and last name, optional phone number, gender, and your interests.</li>
        <li><b>Profile:</b> profile photo, headline, bio, availability, and your grade. Your exact rating is visible only to you.</li>
        <li><b>Content and activity:</b> posts and photos, reflections, comments, likes, saved (“Noted”) posts, mentor requests and notes, mentorships and their dates, events you share, ratings you give, direct messages, reports and blocks.</li>
        <li><b>Consent records:</b> when you accepted our Terms, which version, and that you confirmed you are {L.minAge} or older.</li>
        <li><b>Technical data:</b> IP address, browser and device information and security logs created by our hosting and database providers.</li>
        <li><b>Photos:</b> before upload we resize your photos in your browser, which also removes hidden location and camera data (EXIF).</li>
      </ul>

      <h2>3. How and why we use it</h2>
      <ul>
        <li>To provide {L.product}: create your account, show your profile and content to the right people, deliver messages, run mentorships, notifications and grades (contract).</li>
        <li>To keep people safe and the service secure: moderation, spam and abuse prevention, rate limiting, investigating reports (legitimate interests, legal obligations).</li>
        <li>To communicate with you: verification codes, password resets, service notices (contract, legitimate interests).</li>
        <li>To improve and fix the product using aggregated or limited usage information (legitimate interests).</li>
        <li>To comply with the law and respond to lawful requests.</li>
      </ul>
      <p>We do not sell your personal data and do not use it for third-party advertising.</p>

      <h2>4. Who can see what</h2>
      <ul>
        <li><b>Regular posts:</b> your direct mentors and mentees and their mentors and mentees (two layers) &mdash; including likes, comments and reflections on them.</li>
        <li><b>Global Posts</b> and their likes, comments and reflections: all users.</li>
        <li><b>Profile basics</b> (name, photo, headline, bio, interests, grade): other signed-in users, except people who have blocked you or whom you have blocked.</li>
        <li><b>Direct messages:</b> only you and the other person. <b>Notes sent with mentor requests:</b> the person you ask.</li>
        <li><b>Phone number, gender and exact rating:</b> private to you (and our systems). Reports are visible to our moderators.</li>
      </ul>

      <h2>5. Who we share data with</h2>
      <p>We use service providers (“processors”) who handle data only on our instructions: <b>Supabase</b> (database, authentication, file storage; our project is hosted in the EU, Ireland), <b>Vercel</b> (website hosting), our <b>email provider</b> (sending codes), and, if enabled, <b>Cloudflare Turnstile</b> (bot protection) and a payment provider when paid features launch. We may disclose data if required by law or to protect people’s safety.</p>
      <p>Some providers may process data outside Nigeria or the EU. Where that happens we rely on appropriate safeguards such as contractual protections.</p>

      <h2>6. How long we keep it</h2>
      <p>We keep your data while your account is open. When you delete your account we delete your profile, posts, photos, messages you sent and other personal data from our live systems; copies in backups are removed on their normal cycle. We may keep limited records (for example about reports and enforcement) where needed for safety, fraud prevention or legal obligations.</p>

      <h2>7. Your choices and rights</h2>
      <p>In <b>Settings</b> you can edit your profile, <b>download a copy of your data</b>, see and manage blocked users, and <b>delete your account</b>. You can also write to {L.privacyEmail} to exercise any of your rights described in the <a href="/data-protection">Data Protection Notice</a>.</p>

      <h2>8. Security</h2>
      <p>We protect data with encryption in transit, access controls and row-level security in our database, private storage for post photos with expiring links, rate limiting and monitoring. No system is perfectly secure; please use a strong, unique password.</p>

      <h2>9. Children</h2>
      <p>{L.product} is only for people aged {L.minAge} and over. If you think someone younger has an account, please report it and we will act.</p>

      <h2>10. Cookies and similar technologies</h2>
      <p>We use only what is needed to run the service: secure sign-in cookies, and local or session storage in your browser for your theme choice, your recent searches, and temporary links to photos. We do not use advertising cookies.</p>

      <h2>11. Changes and contact</h2>
      <p>We will update this policy as {L.product} changes and tell you about significant changes. Questions: {L.privacyEmail}.</p>
    </>
  )
}
