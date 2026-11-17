# siriraj-bookmarklet

**siriraj-bookmarklet** is a one-click browser tool that helps you get the full text of an article or e-book from the page you are reading.

Click it on a journal article, a PubMed record, or a book page. It finds the **DOI**, **PMID** or **ISBN-13** on the page and then:

| Found on the page | What happens |
|---|---|
| **DOI** (article) | 1. Checks **Unpaywall** for a free, legal open-access copy and offers to open it.<br>2. If the site is a database Mahidol University subscribes to, offers to reopen the page through **Mahidol EZproxy**.<br>3. Otherwise, looks up the citation on **Crossref** and opens it in the **Siriraj SFX** link resolver. |
| **PMID** (PubMed) | Opens the record in the **Siriraj SFX** link resolver. |
| **ISBN-13** (e-book) | Looks up the book title on **Google Books** and searches the **Siriraj SFX e-book** list. |
| **Nothing found** | Asks whether you want an article or an e-book, then lets you type the DOI or ISBN-13. |

If the page has more than one DOI or ISBN, the tool asks you which one to use.

> **Note:** Some links lead to subscribed content. You may need to sign in with your Mahidol University account.

---

## Files

| File | What it is | Use it for |
|---|---|---|
| [`bookmarklet.js`](bookmarklet.js) | A minified, single-line, URL-encoded version that starts with `javascript:(function(){...})();` | **Option 1**: save it as a browser bookmark and click it any time. |
| [`full-code.js`](full-code.js) | The full, readable source code with comments. | **Option 2**: paste it into the Chrome Developer Console. Also the file to read or edit. |

Both files do exactly the same thing.

---

## Option 1: Run as a Bookmarklet (recommended)

Set this up once. After that, it takes one click.

### Step 1: Copy the code

1. Open [`bookmarklet.js`](bookmarklet.js) on GitHub.
2. Click the **Raw** button.
3. Select all the text (`Ctrl+A` on Windows/Linux, `Cmd+A` on Mac) and copy it (`Ctrl+C` / `Cmd+C`).
   The text must start with `javascript:`.

### Step 2: Create the bookmark in Google Chrome

1. Show the bookmarks bar: press `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (Mac).
2. Right-click an empty space on the bookmarks bar and choose **Add page…**.
   (You can also open **⋮ menu → Bookmarks and lists → Bookmark manager**, then **⋮ → Add new bookmark**.)
3. In **Name**, type a short name you will remember, for example `Siriraj`.
4. In **URL**, paste the code you copied (`Ctrl+V` / `Cmd+V`).
5. Click **Save**.

> **Tip:** Chrome sometimes removes the `javascript:` part when you paste. If the bookmark does nothing, edit it and make sure the URL starts with `javascript:`.

### Step 3: Use it

1. Open an article, a PubMed record, or a book page.
2. Click the **Siriraj** bookmark on your bookmarks bar.
3. Answer any questions that pop up. The result opens in a new tab.

> If nothing opens, Chrome may be blocking pop-ups. Click the pop-up icon at the right end of the address bar and choose **Always allow pop-ups**.

---

## Option 2: Run via the Chrome Developer Console

Use this if you can't add bookmarks (for example, on a shared computer) or if you want to test the code.

1. Open an article, a PubMed record, or a book page in Google Chrome.
2. Open Chrome DevTools on the **Console** tab:
   - **Windows / Linux:** press `F12` or `Ctrl+Shift+J`
   - **Mac:** press `Cmd+Option+J`
   If DevTools opens on a different tab, click **Console**.
3. Open [`full-code.js`](full-code.js) on GitHub, click **Raw**, then select all and copy the code.
4. Click inside the Console and paste the code.
   - The first time, Chrome may warn you about pasting code and ask you to type **`allow pasting`**. Type it, press `Enter`, and paste again.
5. Press **`Enter`** to run it.
6. Answer any questions that pop up. The result opens in a new tab.

> **Security note:** Only paste code that you trust into the Console. You can read all of `full-code.js` before you run it.

---

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](LICENSE.md).
