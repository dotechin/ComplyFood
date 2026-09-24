"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentCategory = exports.LogStatus = exports.LogType = void 0;
var LogType;
(function (LogType) {
    LogType["TEMPERATURE"] = "temperature";
    LogType["CLEANING"] = "cleaning";
    LogType["RECEIVING"] = "receiving";
    LogType["CHECKLIST"] = "checklist";
    LogType["INCIDENT"] = "incident";
})(LogType || (exports.LogType = LogType = {}));
var LogStatus;
(function (LogStatus) {
    LogStatus["PENDING"] = "pending";
    LogStatus["CONFIRMED"] = "confirmed";
    LogStatus["OVERRIDDEN"] = "overridden";
})(LogStatus || (exports.LogStatus = LogStatus = {}));
var DocumentCategory;
(function (DocumentCategory) {
    DocumentCategory["GENERAL"] = "general";
    DocumentCategory["HACCP_MANUAL"] = "haccp_manual";
    DocumentCategory["STORE_LAYOUT"] = "store_layout";
    DocumentCategory["PERMIT"] = "permit";
    DocumentCategory["CERTIFICATE"] = "certificate";
    DocumentCategory["PROCEDURE"] = "procedure";
    DocumentCategory["INSPECTION_EVIDENCE"] = "inspection_evidence";
})(DocumentCategory || (exports.DocumentCategory = DocumentCategory = {}));
//# sourceMappingURL=log.js.map