import { LEGAL } from '@/lib/legal'

export const metadata = { title: 'Terms of Use · Exclusive' }

export default function Terms() {
  const L = LEGAL
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="sub">Last updated: {L.updated} · Version {L.termsVersion}</p>

      <h2>1. About these terms</h2>
      <p>These Terms of Use (“Terms”) are an agreement between you and {L.company} (“we”, “us”) for your use of {L.product}, a mentorship-based social platform. By creating an account or using {L.product} you agree to these Terms and to our <a href="/privacy">Privacy Policy</a> and <a href="/data-protection">Data Protection Notice</a>. If you do not agree, please do not use {L.product}.</p>

      <h2>2. Who can use {L.product}</h2>
      <ul>
        <li>You must be at least <b>{L.minAge} years old</b>. By signing up you confirm that you are. We may close accounts we believe belong to someone under {L.minAge}.</li>
        <li>You must give accurate information, keep one account, and keep your password secure. You are responsible for activity on your account.</li>
        <li>You must be legally able to enter into this agreement where you live.</li>
      </ul>

      <h2>3. How {L.product} works</h2>
      <ul>
        <li>Anyone can be both a mentor and a mentee. A mentorship begins when a mentor accepts a request and may have an end date, or none.</li>
        <li>Regular posts are visible only within your network of direct mentors and mentees and their own mentors and mentees (two layers). A <b>Global Post</b>, and the likes, comments and reflections on it, are visible to all users.</li>
        <li>Messages are only possible between mentors and mentees, and some categories have monthly limits.</li>
        <li>Mentors and mentees are independent people. We do not verify anyone’s qualifications, and nothing on {L.product} is professional, legal, medical, financial or other regulated advice. Decisions you take based on what you read or are told are your own.</li>
      </ul>

      <h2>4. Your content</h2>
      <p>You own what you post. You give us a worldwide, non-exclusive, royalty-free licence to host, store, display and distribute your content on {L.product} as needed to run the service, and to the people who are allowed to see it under the visibility rules above. This licence ends when you delete the content or your account, except for copies in backups for a limited period and content others have already reflected on or quoted in their own posts.</p>
      <p>You are responsible for your content and confirm you have the right to share it.</p>

      <h2>5. Community rules</h2>
      <p>You must not use {L.product} to:</p>
      <ul>
        <li>harass, bully, threaten or stalk anyone, or share hate speech;</li>
        <li>post sexual content involving minors (we report this to the authorities), or other sexually explicit or graphically violent material;</li>
        <li>post anything illegal, fraudulent, or that infringes others’ rights, including privacy rights;</li>
        <li>impersonate others, mislead people about who you are, or manipulate ratings and grades;</li>
        <li>send spam or unwanted promotions, scrape data, or try to get around limits, security or visibility rules;</li>
        <li>share other people’s private information without permission.</li>
      </ul>

      <h2>6. Reporting, blocking and enforcement</h2>
      <p>You can report content or people and block anyone from the menu on posts, comments, reflections and profiles. We may remove content, restrict features, suspend or close accounts that break these Terms or put others at risk, with or without notice where the situation is urgent. We may keep records of reports and actions to protect our users and meet legal duties.</p>

      <h2>7. Ratings and grades</h2>
      <p>Any user may rate any other user with a thumbs up or down. A user’s rating is the number of thumbs up minus thumbs down and only that user sees the exact number; others see a grade (A to E). The grade thresholds adjust automatically with the number of members. Grades are produced automatically from other users’ ratings and are not a verification of anyone’s ability or character.</p>

      <h2>8. Premium, tips and payments</h2>
      <p>Some features (such as extra slots, scheduling, post editing, a Tip Jar and paid mentee slots) are part of paid plans. When paid features launch, the price, billing period, renewal, refund rules and our commission on paid mentee slots and tips will be shown to you before you pay and will form part of these Terms. Until then, paid features may not be available to purchase.</p>

      <h2>9. Our rights and your feedback</h2>
      <p>{L.product}, its design and software belong to us or our licensors. You may not copy or reverse engineer them except as the law allows. If you give us feedback we may use it without obligation to you.</p>

      <h2>10. Availability and changes</h2>
      <p>We try to keep {L.product} available and secure but we do not promise it will be uninterrupted or error-free. We may change or end features. We may update these Terms; if a change is significant we will tell you in the app or by email. Continuing to use {L.product} after a change means you accept it.</p>

      <h2>11. Ending your account</h2>
      <p>You can delete your account at any time in Settings. We may suspend or close accounts as described in section 6. Sections that by their nature should continue (for example 4, 5, 12 and 13) will continue after your account ends.</p>

      <h2>12. Liability</h2>
      <p>To the extent the law allows, we provide {L.product} “as is”, are not responsible for what users post or say, and are not liable for indirect or consequential losses. Nothing in these Terms limits liability that cannot be limited by law, such as for fraud or for death or personal injury caused by negligence. Your legal rights as a consumer are not affected.</p>

      <h2>13. Governing law and disputes</h2>
      <p>These Terms are governed by {L.governingLaw}. Courts there will have jurisdiction, but if you are a consumer in another country you keep any right to use the courts of your home country that the law gives you.</p>

      <h2>14. Contact</h2>
      <p>{L.company}, {L.address}. Email: {L.contactEmail}</p>
    </>
  )
}
