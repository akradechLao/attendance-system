/**
 * ============================================================
 * Google Apps Script - HR Attendance System Integration
 * ============================================================
 *
 * สคริปต์นี้เชื่อมต่อกับ Attendance System API
 * เพื่อดึงข้อมูลการเข้างานไปบันทึกใน Google Sheets
 *
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheets ใหม่
 * 2. ไปที่ Extensions > Apps Script
 * 3. ลบโค้ดเดิมออก แล้ววางโค้ดนี้แทน
 * 4. แก้ไขค่า CONFIG ด้านล่างให้ตรงกับระบบของคุณ
 * 5. บันทึก (Ctrl+S)
 * 6. รันฟังก์ชัน `setupSheet` ครั้งแรกเพื่อสร้าง Headers
 *
 * ============================================================
 */

// ==================== CONFIG ====================
// แก้ไขค่าเหล่านี้ให้ตรงกับระบบของคุณ

const CONFIG = {
  // URL ของ API (แก้ไขให้ตรงกับ domain ที่ deploy ไว้)
  // ตัวอย่าง: "https://your-app.vercel.app/api"
  API_URL: "http://localhost:3000/api",

  // API Key ที่ตั้งไว้ใน .env
  API_KEY: "attendance-system-api-key-2024",

  // ชื่อ Sheet tabs
  SHEETS: {
    ATTENDANCE: "Attendance",
    EMPLOYEES: "Employees",
    SHIFTS: "Shifts",
  },
};

// ==================== SETUP ====================

/**
 * สร้าง Headers สำหรับทุก Sheet - รันครั้งแรกหลังจากติดตั้ง
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Attendance sheet
  createSheetIfNotExists(ss, CONFIG.SHEETS.ATTENDANCE, [
    "ID",
    "Employee Name",
    "Group",
    "Date",
    "Check-In",
    "Check-Out",
    "Status",
    "GPS",
  ]);

  // Employees sheet
  createSheetIfNotExists(ss, CONFIG.SHEETS.EMPLOYEES, [
    "ID",
    "Name",
    "Group",
    "WFH Quota",
    "Preferred Off Day",
  ]);

  // Shifts sheet
  createSheetIfNotExists(ss, CONFIG.SHEETS.SHIFTS, [
    "ID",
    "Employee Name",
    "Group",
    "Work Date",
    "Shift Type",
  ]);

  Logger.log("Setup complete! Sheets created with headers.");
  SpreadsheetApp.getUi().alert("Setup complete! Sheets created with headers.");
}

function createSheetIfNotExists(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ==================== API HELPERS ====================

function apiGet(endpoint, params) {
  let url = CONFIG.API_URL + endpoint;
  if (params) {
    const queryString = Object.entries(params)
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join("&");
    url += "?" + queryString;
  }

  const options = {
    method: "GET",
    headers: {
      "x-api-key": CONFIG.API_KEY,
      "Content-Type": "application/json",
    },
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

// ==================== SYNC FUNCTIONS ====================

/**
 * ดึงข้อมูล Attendance ตามวันที่ระบุ
 * @param {string} date - วันที่ในรูปแบบ YYYY-MM-DD (ถ้าไม่ระบุจะใช้วันนี้)
 */
function syncAttendance(date) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    CONFIG.SHEETS.ATTENDANCE
  );
  if (!sheet) {
    Logger.log("Sheet not found. Run setupSheet() first.");
    return;
  }

  const params = date ? { date: date } : {};
  const result = apiGet("/attendance", params);

  if (!result.success) {
    Logger.log("Error: " + result.error);
    return;
  }

  const data = result.data;
  if (data.length === 0) {
    Logger.log("No attendance records found.");
    return;
  }

  // Clear existing data (keep header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }

  // Write new data
  const rows = data.map((r) => [
    r.id,
    r.employeeName,
    r.groupType,
    r.date,
    r.checkIn || "",
    r.checkOut || "",
    r.status || "",
    r.latLong || "",
  ]);

  sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  Logger.log(`Synced ${rows.length} attendance records.`);
}

/**
 * ดึงข้อมูล Attendance ตามช่วงวันที่
 * @param {string} startDate - วันที่เริ่มต้น YYYY-MM-DD
 * @param {string} endDate - วันที่สิ้นสุด YYYY-MM-DD
 */
function syncAttendanceRange(startDate, endDate) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    CONFIG.SHEETS.ATTENDANCE
  );
  if (!sheet) {
    Logger.log("Sheet not found. Run setupSheet() first.");
    return;
  }

  const result = apiGet("/attendance", { start: startDate, end: endDate });

  if (!result.success) {
    Logger.log("Error: " + result.error);
    return;
  }

  const data = result.data;
  if (data.length === 0) {
    Logger.log("No attendance records found.");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }

  const rows = data.map((r) => [
    r.id,
    r.employeeName,
    r.groupType,
    r.date,
    r.checkIn || "",
    r.checkOut || "",
    r.status || "",
    r.latLong || "",
  ]);

  sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  Logger.log(`Synced ${rows.length} attendance records.`);
}

/**
 * ดึงข้อมูลพนักงานทั้งหมด
 */
function syncEmployees() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    CONFIG.SHEETS.EMPLOYEES
  );
  if (!sheet) {
    Logger.log("Sheet not found. Run setupSheet() first.");
    return;
  }

  const result = apiGet("/employees");

  if (!result.success) {
    Logger.log("Error: " + result.error);
    return;
  }

  const data = result.data;
  if (data.length === 0) {
    Logger.log("No employees found.");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }

  const rows = data.map((e) => [
    e.id,
    e.name,
    e.groupType,
    e.wfhQuota,
    e.preferredOffDay || "",
  ]);

  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  Logger.log(`Synced ${rows.length} employees.`);
}

/**
 * ดึงข้อมูลตารางเวรตามช่วงสัปดาห์
 * @param {string} startDate - วันที่เริ่มต้นสัปดาห์ YYYY-MM-DD
 * @param {string} endDate - วันที่สิ้นสุดสัปดาห์ YYYY-MM-DD
 */
function syncShifts(startDate, endDate) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    CONFIG.SHEETS.SHIFTS
  );
  if (!sheet) {
    Logger.log("Sheet not found. Run setupSheet() first.");
    return;
  }

  const params = {};
  if (startDate) params.start = startDate;
  if (endDate) params.end = endDate;

  const result = apiGet("/shifts", Object.keys(params).length > 0 ? params : undefined);

  if (!result.success) {
    Logger.log("Error: " + result.error);
    return;
  }

  const data = result.data;
  if (data.length === 0) {
    Logger.log("No shift records found.");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }

  const rows = data.map((s) => [
    s.id,
    s.employeeName,
    s.groupType,
    s.workDate,
    s.shiftType,
  ]);

  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  Logger.log(`Synced ${rows.length} shift records.`);
}

/**
 * Sync ข้อมูลทั้งหมด (Attendance + Employees + Shifts)
 */
function syncAll() {
  syncEmployees();
  syncAttendance();
  syncShifts();
  Logger.log("All data synced successfully!");
  SpreadsheetApp.getUi().alert("All data synced successfully!");
}

// ==================== CUSTOM MENU ====================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Attendance System")
    .addItem("Setup (ครั้งแรก)", "setupSheet")
    .addSeparator()
    .addItem("Sync All Data", "syncAll")
    .addItem("Sync Attendance (Today)", "syncAttendanceToday")
    .addItem("Sync Employees", "syncEmployees")
    .addItem("Sync Shifts (This Week)", "syncShiftsThisWeek")
    .addSeparator()
    .addItem("Sync Attendance by Date...", "syncAttendanceByDatePrompt")
    .addItem("Sync Attendance by Range...", "syncAttendanceRangePrompt")
    .addItem("Sync Shifts by Range...", "syncShiftsRangePrompt")
    .addToUi();
}

// ==================== MENU FUNCTIONS ====================

function syncAttendanceToday() {
  syncAttendance();
}

function syncShiftsThisWeek() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  syncShifts(
    formatDate(startOfWeek),
    formatDate(endOfWeek)
  );
}

function syncAttendanceByDatePrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Sync Attendance by Date",
    "Enter date (YYYY-MM-DD):",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const date = response.getResponseText().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      syncAttendance(date);
    } else {
      ui.alert("Invalid date format. Please use YYYY-MM-DD.");
    }
  }
}

function syncAttendanceRangePrompt() {
  const ui = SpreadsheetApp.getUi();
  const startResponse = ui.prompt(
    "Sync Attendance Range",
    "Enter start date (YYYY-MM-DD):",
    ui.ButtonSet.OK_CANCEL
  );

  if (startResponse.getSelectedButton() !== ui.Button.OK) return;

  const endResponse = ui.prompt(
    "Sync Attendance Range",
    "Enter end date (YYYY-MM-DD):",
    ui.ButtonSet.OK_CANCEL
  );

  if (endResponse.getSelectedButton() !== ui.Button.OK) return;

  const startDate = startResponse.getResponseText().trim();
  const endDate = endResponse.getResponseText().trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    syncAttendanceRange(startDate, endDate);
  } else {
    ui.alert("Invalid date format. Please use YYYY-MM-DD.");
  }
}

function syncShiftsRangePrompt() {
  const ui = SpreadsheetApp.getUi();
  const startResponse = ui.prompt(
    "Sync Shifts Range",
    "Enter start date (YYYY-MM-DD):",
    ui.ButtonSet.OK_CANCEL
  );

  if (startResponse.getSelectedButton() !== ui.Button.OK) return;

  const endResponse = ui.prompt(
    "Sync Shifts Range",
    "Enter end date (YYYY-MM-DD):",
    ui.ButtonSet.OK_CANCEL
  );

  if (endResponse.getSelectedButton() !== ui.Button.OK) return;

  const startDate = startResponse.getResponseText().trim();
  const endDate = endResponse.getResponseText().trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    syncShifts(startDate, endDate);
  } else {
    ui.alert("Invalid date format. Please use YYYY-MM-DD.");
  }
}

// ==================== UTILITIES ====================

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ==================== TRIGGER (Optional) ====================

/**
 * ตั้ง Trigger ให้ Sync อัตโนมัติทุกวัน 18:00
 * รันฟังก์ชันนี้ครั้งเดียวเพื่อตั้ง Trigger
 */
function createDailyTrigger() {
  ScriptApp.newTrigger("syncAll")
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .create();
  Logger.log("Daily trigger created. Will sync at 18:00 every day.");
}

/**
 * ลบ Trigger ทั้งหมด
 */
function removeAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  Logger.log("All triggers removed.");
}
