# 0FluffRead

Zero ads. Zero tracking. Just articles.

## 🚀 Live

The current stable version is live at: [https://raw-json.github.io/0FluffRead/](https://raw-json.github.io/0FluffRead/)

---

## ✨ Features

* **Pure Content:** Strips away advertisements and extraneous tracking code.
* **CORS Bypass:** Utilizes an external proxy (`rss2json.com`) to handle cross-origin resource sharing, making any valid RSS URL loadable client-side.
* **Minimal Footprint:** Built with vanilla JavaScript, HTML, and a utility-first CSS framework (Tailwind CSS CDN).
* **Robust Fetching:** Includes an exponential backoff retry mechanism for reliable feed loading.

---

## 🛠️ Installation & Setup

This is a static-only application. No backend or build step is required.

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/RawJSON/0FluffRead.git](https://github.com/RawJSON/0FluffRead.git)
    cd 0FluffRead
    ```

2.  **Run Locally:**
    Open `index.html` directly in your web browser.

---

## 🏛️ Architecture

The entire stack is designed for speed and simplicity:

* **HTML:** The structure, utilizing semantic elements.
* **JavaScript (`script.js`):** The functional core, handling DOM manipulation, API fetching, and the exponential backoff logic.
* **CSS (`style.css` + Tailwind CDN):** Purely for visual presentation and layout. No complex CSS pre-processors or frameworks.
* **RSS to JSON Proxy:** The API is leveraged to turn the raw XML data from an RSS feed into structured, usable JSON objects, which simplifies the JavaScript parsing logic.

---

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
