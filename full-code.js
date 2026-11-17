/**
 * siriraj-bookmarklet — full, readable source
 * ============================================
 *
 * Paste this whole file into the Google Chrome Developer Console
 * (F12 → "Console" tab) while viewing an article or e-book page,
 * then press Enter.
 *
 * What it does:
 *   1. Scans the current page for a DOI, PMID or ISBN-13.
 *   2. For an article (DOI):
 *        - offers the open-access full text via Unpaywall, if one exists;
 *        - otherwise offers to reopen the page through Mahidol University's
 *          EZproxy (when the site is a subscribed database);
 *        - otherwise looks the DOI up in Crossref and opens the citation
 *          in the Siriraj SFX link resolver.
 *   3. For a PMID: opens the record in the Siriraj SFX link resolver.
 *   4. For an e-book (ISBN-13): looks up the title via Google Books and
 *      searches the Siriraj SFX e-book A–Z list (or opens SFX by ISBN).
 *   5. If nothing is found, it asks the user to type a DOI or ISBN-13.
 *
 * The minified, one-line version of this script is in bookmarklet.js.
 */
(function () {
  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /** Hostnames of databases that Mahidol University subscribes to (via EZproxy). */
  var MU_EZPROXY_DB_HOSTNAMES = [
    "academic.oup.com",
    "accessmedicine.mhmedical.com",
    "accesspharmacy.mhmedical.com",
    "bestpractice.bmj.com",
    "clients.mintel.com",
    "dl.acm.org",
    "ebookcentral.proquest.com",
    "experiments.springernature.com",
    "go.gale.com",
    "ieeexplore.ieee.org",
    "incites.clarivate.com",
    "iopscience.iop.org",
    "jamanetwork.com",
    "jcr.clarivate.com",
    "journal.chestnet.org",
    "journals.aai.org",
    "journals.asm.org",
    "journals.bmj.com",
    "journals.lww.com",
    "link.springer.com",
    "mahidol.naxosmusiclibrary.com",
    "mahidol.naxosvideolibrary.com",
    "mahidol.naxosworks.com",
    "music.alexanderstreet.com",
    "neurology.mhmedical.com",
    "online.sagepub.com",
    "onlinelibrary.wiley.com",
    "ovidsp.ovid.com",
    "pediatrics.aappublications.org",
    "pedsinreview.aappublications.org",
    "plants.jstor.org",
    "portal.igpublish.com",
    "publications.aap.org",
    "publications.ebsco.com",
    "pubs.acs.org",
    "scholar.google.com",
    "scifinder-n.cas.org",
    "scifinder.cas.org",
    "search.alexanderstreet.com",
    "search.ebscohost.com",
    "search.proquest.com",
    "sk.sagepub.com",
    "thejns.org",
    "www.acpjournals.org",
    "www.aip.org",
    "www.annualreviews.org",
    "www.aps.org",
    "www.biomedcentral.com",
    "www.cambridge.org",
    "www.cas.org",
    "www.cell.com",
    "www.clinicalkey.com",
    "www.embase.com",
    "www.emerald.com",
    "www.galepages.com",
    "www.ipasource.com",
    "www.jstor.org",
    "www.karger.com",
    "www.li.mahidol.ac.th",
    "www.liebertpub.com",
    "www.micromedexsolutions.com",
    "www.nature.com",
    "www.ncbi.nlm.nih.gov",
    "www.nejm.org",
    "www.oreilly.com",
    "www.oxfordbibliographies.com",
    "www.oxfordmusiconline.com",
    "www.oxfordwesternmusic.com",
    "www.portal.euromonitor.com",
    "www.rsc.org",
    "www.sciencedirect.com",
    "www.scopus.com",
    "www.springer.com",
    "www.tandfonline.com",
    "www.taylorfrancis.com",
    "www.thieme-connect.com",
  ];
  var allowedList = MU_EZPROXY_DB_HOSTNAMES.map(function (h) {
    return h.toLowerCase();
  });

  /** Siriraj SFX link resolver. */
  var BASE_SFX = "https://sfx-66sira.hosted.exlibrisgroup.com/66sira";
  /** Mahidol University EZproxy login prefix. */
  var EZPROXY = "https://ejournal.mahidol.ac.th/login?url=";
  /** Contact e-mail sent to the Unpaywall API (required by their terms). */
  var UNPAYWALL_EMAIL = "unpaywall_01@example.com";

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  var currentHostname = window.location.hostname;
  /** User's answer to the EZproxy question: "unanswered", true or false. */
  var userCheck = "unanswered";
  var doi;
  var isbn;

  // Every DOI-like string in the page HTML, plus "doi.org/10.…" links.
  var doiMatches = document.documentElement.innerHTML.match(
    /10\.\d{4,9}\/[-._;()\/:A-Z0-9]+/gim
  );
  var doiOrgMatches = document.documentElement.innerHTML.match(
    /doi.org\/10\.\d{4,9}\/[-._;()\/:A-Z0-9]+/gim
  );
  var allIsbn = findISBN13();
  var allDoi;

  // ---------------------------------------------------------------------------
  // DOI helpers
  // ---------------------------------------------------------------------------

  /** Asks the user for a DOI. Sets `this.current = [doi]` when valid. */
  function UserDoiInput(existing) {
    var input;
    if (existing == null) {
      input = prompt("Please enter the DOI number, e.g. 10.xxx/xxx:");
    }
    if (input != null && input.slice(0, 3) == "10.") {
      this.current = [input];
    } else {
      alert("Please enter a valid DOI number!");
    }
  }

  /**
   * Picks the DOI to use.
   *   - If one DOI appears more often than any other, that one wins.
   *   - If there is a tie, the user is asked to type the DOI.
   *   - If `metaId` is a PMID (not starting with "10."), the PMID is opened
   *     directly in SFX.
   * Returns the chosen DOI (or undefined).
   */
  function doiFinder(dois, metaId) {
    var userInput;
    if (dois == null) {
      if (metaId != null) {
        dois = [];
      } else {
        userInput = new UserDoiInput(undefined);
        dois = userInput.current;
        if (dois == null) return;
      }
    }

    // Normalise "doi.org/10.xxx" etc. to "10.xxx".
    dois = dois.map(function (d) {
      return d.match("10.*")[0];
    });

    var best = dois[0];
    if (dois.length > 1) {
      // Count occurrences and choose the most frequent DOI (null on a tie).
      var counts = [];
      for (var k in dois) {
        counts[dois[k]] ? counts[dois[k]]++ : (counts[dois[k]] = 1);
      }
      var max = 0;
      best = null;
      for (var key in counts) {
        if (counts[key] > max) {
          max = counts[key];
          best = key;
        } else if (counts[key] == max) {
          best = null;
        }
      }
    }

    if (best == null && metaId == null) {
      alert("Multiple DOIs were found!, Please specify the DOI number");
      userInput = new UserDoiInput(best, metaId);
      doi = userInput.current;
    } else if (metaId != null && metaId.substring(0, 3) != "10.") {
      // metaId is a PMID.
      window.open(BASE_SFX + "?sid=Entrez:PubMed&id=pmid:" + metaId);
    } else {
      doi = best == null ? metaId : best;
    }
    return doi;
  }

  // ---------------------------------------------------------------------------
  // ISBN helpers
  // ---------------------------------------------------------------------------

  /** True for a 13-digit ISBN starting with 978 (hyphens ignored). */
  function isValidISBN13(value) {
    value = value.replace(/-/g, "");
    return value.length === 13 && value.substring(0, 3) === "978";
  }

  /** Asks the user for an ISBN-13. Sets `this.current = [isbn]` when valid. */
  function UserIsbnInput() {
    var input = prompt("Please enter the ISBN-13 number, e.g. 978-xxxxxxxxxxxxx");
    if (input != null && isValidISBN13(input)) {
      this.current = [input];
    } else {
      alert("Please enter the valid ISBN-13 number!");
    }
  }

  /** Returns every unique ISBN-13 found in the page text and attributes. */
  function findISBN13() {
    var pattern = new RegExp(
      /\b978-\d{10}\b/g.source + "|" + /\b978\d{10}\b/g.source,
      "g"
    );
    var sources = [document.body ? document.body.innerText : ""];

    var elements = document.querySelectorAll("*");
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (!el.attributes) continue;
      for (var j = 0; j < el.attributes.length; j++) {
        var attr = el.attributes[j];
        if (attr.value) sources.push(attr.value);
      }
    }

    var found = {};
    for (var s = 0; s < sources.length; s++) {
      var matches = sources[s].match(pattern);
      if (!matches) continue;
      for (var m = 0; m < matches.length; m++) {
        var candidate = matches[m].replace(/-/g, "");
        if (isValidISBN13(candidate)) found[candidate] = true;
      }
    }
    return Object.keys(found);
  }

  /** Chooses one ISBN-13 from the list, asking the user when there are several. */
  async function findFinalIsbn(isbns) {
    var userInput;
    if (isbns.length === 1) return isbns[0];

    if (isbns.length === 0) {
      alert("Invalid ISBN-13 found.");
      userInput = new UserIsbnInput();
      return userInput.current[0];
    }

    alert(
      "Multiple ISBN-13 found: " +
        isbns[0] + ", " + isbns[1] +
        (isbns.length > 2 ? ", ..." : "")
    );
    var title = await isbn13ToTitle(isbns[0]);
    var useFirst =
      title != null
        ? await confirm(
            "The title of the first ISBN-13 is: " + title +
              ". Then, choose this book (OK), or specify another ISBN-13 (Cancel) ?"
          )
        : await confirm("Choose the first one (OK), or specify (Cancel) ?");

    if (useFirst == true) return isbns[0];
    userInput = new UserIsbnInput();
    return userInput.current == null ? null : userInput.current[0];
  }

  /** Removes ISBNs that are only fragments of a DOI already on the page. */
  function findPartialISBNinDOI(isbns, dois) {
    var normalise = function (v) {
      return String(v || "").toLowerCase().replace(/[-\s]/g, "");
    };
    return isbns.filter(function (isbnValue) {
      var n = normalise(isbnValue);
      return n
        ? !dois.some(function (d) {
            return normalise(d).includes(n);
          })
        : [];
    });
  }

  /** Looks up a book title from Google Books by ISBN-13 (null if not found). */
  async function isbn13ToTitle(isbnValue) {
    try {
      var res = await fetch(
        "https://www.googleapis.com/books/v1/volumes?q=isbn:" + isbnValue
      );
      var data = await res.json();
      return data.items && data.items.length > 0
        ? data.items[0].volumeInfo.title
        : null;
    } catch (err) {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Access helpers
  // ---------------------------------------------------------------------------

  /** True if `hostname` equals, or is a subdomain of, any entry in `list`. */
  function isAllowedHost(hostname, list) {
    var host = String(hostname).toLowerCase().replace(/\.$/, "");
    return list.some(function (h) {
      return host === h || host.endsWith("." + h);
    });
  }

  /**
   * Offers (once) to reopen the current page through EZproxy.
   * Returns the user's answer (true / false).
   */
  async function ezproxyCheck(prefix, answer) {
    if (answer == "unanswered") {
      answer = await confirm(
        "This webpage may be available via MU subscribed database, Do you want to try it ?"
      );
    }
    if (answer == true) window.open(prefix + window.location.href);
    return answer;
  }

  // ---------------------------------------------------------------------------
  // Search actions
  // ---------------------------------------------------------------------------

  /** Finds the full text of an article by DOI (Unpaywall → EZproxy → SFX). */
  async function searchArticle(doiValue, email, allowed, ezproxyPrefix, check) {
    // 1) Open-access copy via Unpaywall.
    var useUnpaywall = false;
    var unpaywallRes = await fetch(
      "https://api.unpaywall.org/v2/" + doiValue + "?email=" + email + "&format=json"
    );
    var oa;
    try {
      oa = await unpaywallRes.json();
    } catch (err) {
      oa = { is_oa: false };
    }
    if (oa.is_oa == true) {
      useUnpaywall = await confirm(
        "Want to try downloading the full-text article via Unpaywall !"
      );
    }
    if (useUnpaywall == true) {
      var pdfUrl = oa.best_oa_location.url_for_pdf;
      window.open(pdfUrl == null ? oa.best_oa_location.url : pdfUrl);
      return;
    }

    // 2) EZproxy, if this page is a subscribed database and the user agrees.
    if (isAllowedHost(currentHostname, allowed) && check !== false) {
      check = await ezproxyCheck(ezproxyPrefix, check);
      if (check == true) return;
    }

    // 3) Crossref metadata → SFX OpenURL.
    var crossrefRes = await fetch("https://api.crossref.org/works/" + doiValue);
    if (crossrefRes.status == 404) alert("Cannot find the article from this DOI !");
    var crossref = await crossrefRes.json();
    if (crossref.status != "ok") return;

    var msg = crossref.message;
    var articleTitle = JSON.stringify(msg.title)
      .replace(/<i>|<\/i>|\\n|\[|\]|\"/g, "")
      .trim()
      .replace(/\s+/g, " ");
    var journalTitle = msg["container-title"][0];
    var year;
    try {
      year = msg.published["date-parts"][0][0];
    } catch (err) {
      year = "";
    }
    var volume = msg.volume != null ? msg.volume : "";
    var issue = msg.issue != null ? msg.issue : "";
    var startPage = "";
    var endPage = "";
    if (msg.page != null) {
      var pages = msg.page.split("-");
      startPage = pages[0];
      endPage = pages[1] == null ? startPage : pages[1];
    }
    var issn = msg.ISSN != null ? msg.ISSN[0] : msg.ISSN;

    // URL-encode every value so titles containing "&", "#", "?" etc. survive.
    var param = function (value) {
      return encodeURIComponent(value == null ? "" : value);
    };

    window.open(
      BASE_SFX + "/sfx_local?sid=sfx:citation&genre=article" +
        "&atitle=" + param(articleTitle) +
        "&jtitle=" + param(journalTitle) +
        "&issn=" + param(issn) +
        "&volume=" + param(volume) +
        "&year=" + param(year) +
        "&issue=" + param(issue) +
        "&spage=" + param(startPage) +
        "&epage=" + param(endPage) +
        "&doi=" + param(msg.DOI)
    );
  }

  /** Finds an e-book by ISBN-13 (EZproxy → SFX e-book search). */
  async function searchEbook(isbnValue, allowed, ezproxyPrefix, check) {
    if (isAllowedHost(window.location.hostname, allowed) && check !== false) {
      check = await ezproxyCheck(ezproxyPrefix, check);
      if (check == true) return;
    }

    var title = await isbn13ToTitle(isbnValue);
    var shortTitle;
    try {
      // Drop edition / volume suffixes, e.g. "Title, 3rd Edition" → "Title".
      shortTitle = title
        .split(/, \d|,\s*([A-Za-z-]+)\s+Edition|\s*(?:\d+|-\s*E-Book)/i)[0]
        .trim();
    } catch (err) {
      shortTitle = title;
    }

    window.open(
      shortTitle == null
        ? BASE_SFX + "/sfx_local?sid=sfx:citation&genre=book&rft.isbn=" + isbnValue
        : BASE_SFX +
            "/ebooksearch?param_perform_save=ebooksearch" +
            "&param_category_search_type_save=browseSubCategory" +
            "&param_type_value=textSearch" +
            "&param_pattern_save=" + encodeURIComponent(shortTitle)
    );
  }

  /** Asks "article or e-book?". Returns true when the e-book path was taken. */
  async function askArticleOrEbook(metaId) {
    var wantArticle = await confirm(
      "Click OK for finding an article, Cancel for finding an e-book."
    );
    if (wantArticle == true) {
      doi = await doiFinder(allDoi, metaId);
      return false;
    }
    var userInput = new UserIsbnInput();
    if (userInput.current != null) {
      isbn = userInput.current[0];
      await searchEbook(isbn, allowedList, EZPROXY, userCheck);
      doi = undefined;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------------------

  /** Returns the trimmed `content` of <meta name="…"> (case-insensitive), or null. */
  function metaContent(name) {
    var el = document.querySelector('meta[name="' + name + '" i]');
    var value = el && el.getAttribute("content");
    return value ? value.trim() : null;
  }

  async function mainProcess() {
    allDoi = doiOrgMatches !== null ? doiMatches.concat(doiOrgMatches) : doiMatches;

    // DOI or PMID from the page's citation <meta> tags.
    var metaId = metaContent("citation_doi") || metaContent("citation_pmid") || undefined;

    // SAGE journals keep the DOI in <meta name="dc.Identifier">.
    if (currentHostname == "journals.sagepub.com") {
      var sageMeta = document.getElementsByTagName("meta")["dc.Identifier"];
      if (sageMeta != null) {
        allDoi = [sageMeta.content.replace("_", "/")];
      } else {
        alert("Cannot find any DOI in SAGE journal, Please specify the DOI number!");
        allDoi = null;
      }
    }

    // Ignore "ISBNs" that are really part of a DOI.
    if (allDoi != null && metaId != null && allIsbn.length > 0) {
      allIsbn = findPartialISBNinDOI(allIsbn, allDoi);
    }

    if (allDoi == null && metaId == null) {
      // No DOI / PMID on the page.
      if (allIsbn.length > 0) {
        isbn = await findFinalIsbn(allIsbn);
        if (isbn != null) {
          await searchEbook(isbn, allowedList, EZPROXY, userCheck);
          doi = undefined;
          return;
        }
      } else if (isAllowedHost(currentHostname, allowedList) && userCheck !== false) {
        userCheck = await ezproxyCheck(EZPROXY, userCheck);
        if (userCheck == "unanswered" || userCheck == false) {
          if (await askArticleOrEbook(metaId)) return;
        }
      } else {
        if (await askArticleOrEbook(metaId)) return;
      }
    } else if (allIsbn.length > 0) {
      // Both a DOI/PMID and an ISBN are present: let the user choose.
      var wantArticle = await confirm(
        "Click OK for finding an article, Cancel for finding an e-book."
      );
      if (wantArticle == true) {
        doi = await doiFinder(allDoi, metaId);
      } else {
        isbn = await findFinalIsbn(allIsbn);
        if (isbn != null) {
          await searchEbook(isbn, allowedList, EZPROXY, userCheck);
          doi = undefined;
          return;
        }
      }
    } else {
      doi = await doiFinder(allDoi, metaId);
    }

    if (doi != null) {
      await searchArticle(doi, UNPAYWALL_EMAIL, allowedList, EZPROXY, userCheck);
    } else if (userCheck === true) {
      // The user already accepted EZproxy above and the page was reopened;
      // don't open it a second time.
    } else if (
      isAllowedHost(window.location.hostname, allowedList) &&
      userCheck !== false &&
      (userCheck = await ezproxyCheck(EZPROXY, userCheck)) == true
    ) {
      // Page reopened through EZproxy.
    } else if (doi == null && isbn == null && metaId == null) {
      alert(
        "Cannot find any DOI, PMID, and ISBN-13 number, Please specify one of these numbers!"
      );
    }
  }

  mainProcess();
})();
