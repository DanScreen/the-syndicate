# Cookie & Privacy Notice

> **Note:** This document reflects what the Tiki Acca application actually stores
> and processes. It is not legal advice — a qualified data-protection adviser
> should review it before it is relied on as the final published policy. The live
> pages are at `/privacy` and `/cookies`.

**Data controller:** Tiki Acca
**Contact for privacy queries:** tikiacca@outlook.com

Tiki Acca ("Tiki Acca", "we", "us") is a social tool that helps groups
coordinate accumulator ("acca") ideas. **We do not take bets, hold funds, or act
as a bookmaker** — you place any bets directly with licensed bookmakers.

---

## 1. Cookies

We use a small number of **strictly necessary cookies**. These are required to
sign you in and keep your session secure. Under the UK Privacy and Electronic
Communications Regulations (PECR) and the EU ePrivacy Directive, strictly
necessary cookies are exempt from the consent requirement, so **we do not show a
cookie consent banner**. We do **not** use analytics, advertising, or tracking
cookies, and we do not share cookie data with third parties for those purposes.

### Cookies we set

| Cookie | Purpose | Type | Duration |
| --- | --- | --- | --- |
| `authjs.session-token` (or `__Secure-authjs.session-token` over HTTPS) | Keeps you signed in after login (session authentication). | Strictly necessary | Session / until expiry |
| `authjs.csrf-token` (or `__Host-authjs.csrf-token`) | Protects sign-in and account actions against cross-site request forgery. | Strictly necessary | Session |
| `authjs.callback-url` (or `__Secure-authjs.callback-url`) | Returns you to the correct page after signing in. | Strictly necessary | Session |

> These cookies are set by our authentication library (Auth.js / NextAuth). Exact
> names carry the `__Secure-`/`__Host-` prefix when served over HTTPS. Verify the
> live names in your browser's dev tools.

### Managing cookies

Because these cookies are essential, disabling them in your browser will prevent
you from signing in and using your account. Most browsers let you view and delete
cookies via their settings; signing out also clears your session.

---

## 2. Privacy notice

### 2.1 What we collect and why

**Account information you provide at sign-up:**

| Data | Why we process it | Lawful basis (UK/EU GDPR) |
| --- | --- | --- |
| First name, last name, display name | Identify you to your group, on leaderboards, picks, and emails | Contract (Art. 6(1)(b)) |
| Email address | Sign-in, account security, and service notifications | Contract |
| Password (stored only as a salted bcrypt hash — never in plain text) | Authenticate you securely | Contract |
| Date of birth | Verify you are 18 or over, as this is an adults-only gambling-adjacent service | Legal obligation / legitimate interests (Art. 6(1)(c)/(f)) |

**Information generated as you use Tiki Acca:**

- Groups you own or belong to, and your role in them.
- Accumulator picks ("legs") you submit and their outcomes.
- Points, wins/losses, and other performance statistics.
- Notification preferences and, if you use the mobile app, a device push token
  so we can send the notifications you have opted into.

**Analytics (server-side, no cookies):** we record basic in-app events — the
event type, the associated account (when signed in), and the page path — in our
own database to understand how the product is used and to improve it. This is
**first-party and does not use cookies, pixels, or third-party trackers.** Lawful
basis: legitimate interests in maintaining and improving the service.

### 2.2 What we do NOT do

- We do not use third-party analytics, advertising, or social-media tracking.
- We do not sell your personal data.
- We do not take bets or process payments, so we do not hold financial or
  payment-card data.

### 2.3 Who we share data with

We share personal data only with service providers who help us run Tiki Acca
(processors acting on our instructions) — such as our hosting and infrastructure
providers, our email provider, and, for the mobile app, push-notification
delivery. We may also disclose data where required by law. Where any of these
providers process data outside the UK/EEA, we rely on appropriate safeguards such
as the UK International Data Transfer Agreement or EU Standard Contractual Clauses.

### 2.4 How long we keep it

We keep your account data for as long as your account is active. If you delete
your account, we delete or anonymise your personal data within a reasonable period
afterwards, except where we must retain limited records to meet a legal
obligation.

### 2.5 Your rights

Under UK/EU GDPR you have the right to access, correct, delete, or port your
data, to object to or restrict certain processing, and to withdraw consent where
we rely on it. To exercise any of these, contact tikiacca@outlook.com. You also
have the right to complain to the UK Information Commissioner's Office
(ico.org.uk) or your local supervisory authority.

### 2.6 Children

Tiki Acca is strictly for adults aged 18 and over. We collect date of birth at
sign-up and block anyone under 18. If you believe someone under 18 has created an
account, contact tikiacca@outlook.com and we will remove it.

### 2.7 Changes to this notice

We may update this notice from time to time. Material changes will be highlighted
in the app or by email.
