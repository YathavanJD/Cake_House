# 🎂 Cake House

A responsive website for a cake shop/bakery, featuring a working **contact/inquiry form** backed by a lightweight Node.js server. Customers can browse the site and send inquiries directly, which are delivered straight to the owner's inbox via email.

---

## ✨ Features

- 🍰 Clean, responsive storefront built with HTML, CSS, and JavaScript
- 📩 Contact/inquiry form wired to a real backend (no third-party form service needed)
- 📧 Email delivery of form submissions via **Nodemailer**
- 🛡️ Basic abuse protection with **express-rate-limit**
- 🔐 Environment-based configuration using **dotenv** (no secrets in code)

---

## 🧱 Tech Stack

| Layer      | Technology                          |
|------------|--------------------------------------|
| Frontend   | HTML, CSS, JavaScript (`/public`)   |
| Backend    | Node.js, Express                    |
| Email      | Nodemailer                          |
| Security   | express-rate-limit, dotenv          |
| Dev tools  | Nodemon                             |

---

## 📁 Project Structure

```
Cake_House/
├── public/          # Static frontend (HTML, CSS, JS, images)
├── server.js        # Express server & inquiry form email handler
├── package.json      # Dependencies & scripts
└── .env              # Environment variables (not committed)
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later recommended)
- An email account/app password for sending mail (e.g. Gmail App Password)

### Installation

```bash
# Clone the repository
git clone https://github.com/YathavanJD/Cake_House.git
cd Cake_House

# Install dependencies
npm install
```

### Configuration

Create a `.env` file in the project root with your email credentials, for example:

```env
PORT=3000
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
EMAIL_TO=owner-email@example.com
```

> ⚠️ Never commit your `.env` file — make sure it's included in `.gitignore`.

### Running the App

```bash
# Start the server
npm start

# Or run in development mode with auto-restart
npm run dev
```

The site will be available at `http://localhost:3000` (or whichever port you configured).

---

## 📬 How the Inquiry Form Works

1. A visitor fills out the contact form on the site.
2. The form submits to an Express endpoint on `server.js`.
3. `express-rate-limit` guards the endpoint against spam/abuse.
4. Nodemailer sends the inquiry details to the configured recipient email.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👤 Author

**YathavanJD**
[GitHub Profile](https://github.com/YathavanJD)
