/**
 * @OnlyCurrentDoc
 */

const API_TOKEN = "CHANGE_THIS_TO_YOUR_SECURE_TOKEN_12345";

function doGet(e) {
  return executeRequest(e);
}

function doPost(e) {
  return executeRequest(e);
}

function executeRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const output = JSON.stringify(handleRequest(e));
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function handleRequest(e) {
  var token;
  var action;
  var payload;

  if (e.postData && e.postData.contents) {
    var body = JSON.parse(e.postData.contents || "{}");
    token = body.token;
    action = body.action;
    payload = body.payload;
  } else {
    token = e.parameter.token;
    action = e.parameter.action;
    payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : null;
  }

  if (!token || token !== API_TOKEN) {
    return { success: false, error: "Access denied: invalid token" };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Script must be bound to an active spreadsheet.");

  ensureStructure(ss);

  if (action === "health") {
    return {
      status: "ok",
      message: "Connection successful",
      timestamp: new Date().toISOString()
    };
  }

  if (action === "GET_DATA") {
    return getData(ss);
  }

  if (action === "sync") {
    return syncData(ss, payload || {});
  }

  return { success: false, error: "Invalid action: " + action };
}

function ensureStructure(ss) {
  var tercerosSheet = getOrCreateSheet(ss, "Terceros", ["id", "codigo", "nombre"]);
  var comprobantesSheet = getOrCreateSheet(ss, "Comprobantes", ["id", "tipo", "fecha", "valor", "terceroId", "recibidoDe", "concepto"]);

  if (!tercerosSheet || !comprobantesSheet) {
    throw new Error("No se pudieron preparar las hojas requeridas.");
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var missing = false;
    for (var i = 0; i < headers.length; i++) {
      if (String(currentHeaders[i] || "").trim() === "") {
        missing = true;
        break;
      }
    }
    if (missing) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  return sheet;
}

function syncData(ss, payload) {
  var result = {
    success: true,
    added: {
      comprobantes: [],
      terceros: []
    },
    logs: []
  };

  var terceros = payload.terceros || [];
  var comprobantes = payload.comprobantes || [];

  result.added.terceros = upsertSheetRows(ss.getSheetByName("Terceros"), terceros, function (item) {
    return [item.id, item.codigo || "", item.nombre || ""];
  }, result.logs);

  result.added.comprobantes = upsertSheetRows(ss.getSheetByName("Comprobantes"), comprobantes, function (item) {
    return [
      item.id,
      item.tipo || "",
      parseDate(item.fecha),
      Number(item.valor || 0),
      item.terceroId || "",
      item.recibidoDe || "",
      item.concepto || ""
    ];
  }, result.logs);

  return result;
}

function upsertSheetRows(sheet, items, rowMapper, logs) {
  if (!sheet || !items || items.length === 0) return [];

  var processedIds = [];
  var added = 0;
  var updated = 0;
  var deleted = 0;

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var id = item.id;
    var rowIndex = findRowIndexById(sheet, id);
    var isDeleted = item.deleted === 1 || item.deleted === true || item.deleted === "1";

    if (isDeleted) {
      if (rowIndex !== -1) {
        sheet.deleteRow(rowIndex);
        deleted++;
      }
      processedIds.push(id);
      continue;
    }

    var rowValues = rowMapper(item);

    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      updated++;
    } else {
      sheet.appendRow(rowValues);
      added++;
    }

    processedIds.push(id);
  }

  logs.push(sheet.getName() + ": +" + added + " ~" + updated + " -" + deleted);
  return processedIds;
}

function findRowIndexById(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      return i + 2;
    }
  }

  return -1;
}

function getData(ss) {
  var tercerosSheet = ss.getSheetByName("Terceros");
  var comprobantesSheet = ss.getSheetByName("Comprobantes");

  var tercerosRows = tercerosSheet ? tercerosSheet.getDataRange().getValues().slice(1) : [];
  var comprobantesRows = comprobantesSheet ? comprobantesSheet.getDataRange().getValues().slice(1) : [];

  var terceros = tercerosRows
    .map(function (row) {
      return {
        id: row[0],
        codigo: row[1],
        nombre: row[2]
      };
    })
    .filter(function (row) {
      return !!row.id;
    });

  var comprobantes = comprobantesRows
    .map(function (row) {
      return {
        id: row[0],
        tipo: row[1],
        fecha: toIsoDate(row[2]),
        valor: Number(row[3] || 0),
        terceroId: row[4],
        recibidoDe: row[5],
        concepto: row[6]
      };
    })
    .filter(function (row) {
      return !!row.id;
    });

  return {
    success: true,
    terceros: terceros,
    comprobantes: comprobantes
  };
}

function parseDate(dateStr) {
  if (!dateStr) return "";
  var parts = String(dateStr).split("-");
  if (parts.length !== 3) return dateStr;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function toIsoDate(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  var text = String(value);
  if (text.indexOf("T") > -1) {
    return text.split("T")[0];
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  return text;
}
