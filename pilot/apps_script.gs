// Recall pilot: receives answer rows from the app and writes them to this Google Sheet.
// Paste this into Extensions > Apps Script of a new Google Sheet, then deploy as a web app (PILOT_SETUP.md, step 2).
// Each event type gets its own tab (consent, split, setup, answer, scenario, session_done, rest_day, use_this_week, reminder, delete_request, feedback).

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rows = JSON.parse(e.postData.contents);
    if (!Array.isArray(rows)) rows = [rows];
    var book = SpreadsheetApp.getActiveSpreadsheet();
    rows.forEach(function (row) {
      var name = String(row.event || 'other').replace(/[^a-z_]/g, '');
      var sheet = book.getSheetByName(name) || book.insertSheet(name);
      var header = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
      Object.keys(row).forEach(function (k) { if (header.indexOf(k) < 0) header.push(k); });
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
      sheet.appendRow(header.map(function (k) { return row[k] === undefined ? '' : row[k]; }));
    });
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

// Open the web app URL in a browser to check it is live.
function doGet() {
  return ContentService.createTextOutput('Recall pilot logger is running.');
}
