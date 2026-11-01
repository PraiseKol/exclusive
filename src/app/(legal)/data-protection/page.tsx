import { LEGAL } from '@/lib/legal'

export const metadata = { title: 'Data Protection Notice · Exclusive' }

export default function DataProtection() {
  const L = LEGAL
  return (
    <>
      <h1>Data Protection Notice</h1>
      <p className="sub">Nigeria Data Protection Act 2023 (NDPA) and EU/UK GDPR · Last updated: {L.updated}</p>

      <h2>1. Controller and contact</h2>
      <p>{L.company}, {L.address}. Data protection contact: {L.privacyEmail}.</p>

      <h2>2. Lawful bases</h2>
      <ul>
        <li><b>Contract:</b> providing your account, profile, mentorships, posts, messages and notifications.</li>
        <li><b>Legitimate interests:</b> keeping {L.product} secure, preventing abuse and spam, moderating content, and improving the service, balanced against your rights.</li>
        <li><b>Legal obligation:</b> responding to lawful requests and keeping records the law requires.</li>
        <li><b>Consent:</b> for optional items you choose to provide (for example your phone number) and for any optional notifications. You can withdraw consent at any time without affecting earlier processing.</li>
      </ul>

      <h2>3. Your rights</h2>
      <p>Under the NDPA and the GDPR you have the right to: be informed; <b>access</b> your data; have it <b>corrected</b>; have it <b>erased</b>; <b>restrict</b> or <b>object</b> to certain processing; <b>data portability</b> (receive your data in a common format); and withdraw consent.</p>
      <ul>
        <li><b>Access and portability:</b> Settings → “Download my data” gives you a JSON file of your data.</li>
        <li><b>Erasure:</b> Settings → “Delete my account” removes your account and personal data as described in the Privacy Policy.</li>
        <li><b>Correction:</b> edit your profile any time.</li>
        <li><b>Anything else:</b> email {L.privacyEmail}. We respond without undue delay and within one month (extendable where the law allows for complex requests). We may need to verify your identity first.</li>
      </ul>

      <h2>4. Automated processing</h2>
      <p>Grades (A to E) are calculated automatically from the thumbs up and down given by other users, using thresholds that adjust to the number of members. Grades are informational, do not produce legal effects, and are not used to deny you access to the service.</p>

      <h2>5. Transfers outside your country</h2>
      <p>Our primary database and file storage are hosted in the EU (Ireland). Our hosting and other providers may process data in other countries. We use contracts and other safeguards that the NDPA and GDPR recognise for such transfers.</p>

      <h2>6. Security and breaches</h2>
      <p>We use technical and organisational measures including encryption in transit, row-level access control, private photo storage with expiring links, and rate limiting. If a personal data breach is likely to harm you, we will notify the Nigeria Data Protection Commission (NDPC) and, where the GDPR applies, the relevant EU authority within 72 hours of becoming aware where required, and tell affected people as the law requires.</p>

      <h2>7. Retention</h2>
      <p>We keep personal data for as long as your account is active and delete it when you delete your account, subject to short backup cycles and limited safety and legal records. We review how long we keep each category regularly.</p>

      <h2>8. Children</h2>
      <p>The service is for people aged {L.minAge} or over. We do not knowingly collect children’s data and will delete it if we find it.</p>

      <h2>9. Complaints</h2>
      <p>Please contact us first at {L.privacyEmail} so we can help. You also have the right to complain to the <b>Nigeria Data Protection Commission (NDPC)</b>, or, if you are in the EU/UK, to your local data protection authority.</p>
    </>
  )
}
