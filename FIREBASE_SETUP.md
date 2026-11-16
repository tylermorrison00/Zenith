# Zenith — Firebase Login Setup

This guide sets up sign-in for the Zenith app using Firebase. It is written for
a beginner — just follow the steps in order. You do **not** need to write any
code yourself.

## What this does

Right now, Zenith accounts live only in your own browser (localStorage). After
this setup, accounts will be real Firebase accounts:

1. A person creates an account with their **name, email and password**.
2. Later, they sign in with **the same email and password**.

That is the whole login system — simple email/password accounts only. There is
**no admin account, no Pro account, no roles and no paid tiers** to set up.
Nobody needs a special ID, and nothing in this setup asks you to create one.

## Important — please read first

- **Steps 1–3 need YOU.** They need you to sign in to Google in your own
  browser and click through the Firebase website. The agent cannot do these
  steps for you, and you do not need to share your Google password with
  anyone.
- **Until you finish these steps, nothing breaks.** The app keeps working
  exactly as it does today, with accounts stored in your browser.
- **Create a NEW project called "Zenith".** Do **not** reuse the ClickCart
  Firebase project (`clickcart-4e444`), and do not use the Creators
  Automation or Prism Tools projects. Zenith gets its own separate project.
- The agent has already prepared the code (`src/lib/firebase.ts` and
  `src/lib/auth.ts`). You only need to create the project and paste one small
  piece of config into the code — step 4 below.

---

## Step 1 — Create a new Firebase project named "Zenith"

1. In your browser, go to <https://console.firebase.google.com>.
2. Sign in with your Google account (the sign-in happens in your browser —
   nobody else signs in for you).
3. Click **Add project** (or **Create a project**).
4. Project name: type **`Zenith`**.
5. Click **Continue**, then keep clicking **Continue** / **Create project**
   through the next screens. (You can leave Google Analytics off if it asks —
   Zenith does not need it.)
6. Wait until it says your project is ready, then click **Continue**.

You now have a brand-new, empty Firebase project called **Zenith**, separate
from ClickCart and everything else.

## Step 2 — Turn on Email/Password sign-in

1. Inside your new **Zenith** project, look at the left-hand menu.
2. Click **Build**, then click **Authentication**.
3. Click **Get started** (only if it asks).
4. Click the **Sign-in method** tab at the top.
5. Find **Email/Password** in the list and click it.
6. Switch **Email/Password** to **ON** (enabled), then click **Save**.

That is the only sign-in method Zenith uses. Do not turn on Google sign-in,
phone sign-in, or anything else.

## Step 3 — Register a Web app and copy the config

1. In the same **Zenith** project, click the **gear icon** (Project settings)
   at the top of the left-hand menu.
2. Scroll down to the **Your apps** section.
3. Click the **`</>`** (Web) icon to add a web app.
4. App nickname: type **`Zenith web`** (any nickname is fine), then click
   **Register app**.
5. Firebase will show you a code block starting with `const firebaseConfig = {`
   and containing values like `apiKey`, `authDomain`, `projectId` and `appId`.
   **Copy that whole block** — you will paste its values into the app in the
   next step. (You do not need the hosting steps on that screen; you can
   click **Continue to console**.)

## Step 4 — Paste the config into the app

1. Open the file **`src/lib/firebase.ts`** in the Zenith code.
2. Near the top you will see a block labelled
   `PASTE YOUR ZENITH FIREBASE PROJECT CONFIG HERE` — it looks like this:

   ```ts
   export const FIREBASE_CONFIG: FirebaseConfig = {
     apiKey: '',
     authDomain: '',
     projectId: '',
     storageBucket: '',
     messagingSenderId: '',
     appId: '',
   };
   ```

3. Replace each empty `''` value with the matching value from the config you
   copied in step 3. For example, the `apiKey` value from Firebase goes
   between the quotes after `apiKey:`.
4. Save the file. Paste **only** the values from your own Zenith project —
   never paste config from ClickCart or any other project.

## Step 5 — Check that it works

1. Install the app's packages (this also installs the Firebase library):

   ```bash
   pnpm install
   ```

2. Then run the build:

   ```bash
   pnpm build
   ```

3. If the build finishes with no errors, Firebase is wired up. From now on,
   new accounts are created in Firebase Auth: a person signs up once with
   their name, email and password, and afterwards signs in with that same
   email and password.

---

## If something goes wrong

- **Build error about `firebase` not being found?** Run `pnpm install` again
  (step 5) so the Firebase library is actually downloaded.
- **Sign-up says the email is already in use?** That email already has an
  account — sign in with it instead of creating a new one.
- **Sign-in says the email or password is wrong?** Double-check the email
  spelling and the password — sign-in only works with the exact email and
  password the account was created with.
- **Nothing works yet and you have not done steps 1–3?** That is expected.
  Until the Zenith project exists and its config is pasted in, the app keeps
  using browser-only accounts, exactly as before. Finish steps 1–4 first.
