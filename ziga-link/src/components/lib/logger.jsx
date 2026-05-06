import { base44 } from "@/api/base44Client";

/**
 * Logger structuré — écrit dans AppLog
 * Usage: logger.error("matching", "Echec matching", { details, page, user_email })
 */
const logger = {
  async _log(level, category, message, opts = {}) {
    try {
      await base44.entities.AppLog.create({
        level,
        category,
        message,
        details: opts.details ? String(opts.details).slice(0, 2000) : null,
        stack: opts.stack ? String(opts.stack).slice(0, 3000) : null,
        user_email: opts.user_email || null,
        page: opts.page || (typeof window !== "undefined" ? window.location.pathname : null),
        resolved: false,
      });
    } catch (_) {
      // Ne jamais crasher à cause du logger
    }
  },
  info:     (cat, msg, opts) => logger._log("info", cat, msg, opts),
  warn:     (cat, msg, opts) => logger._log("warn", cat, msg, opts),
  error:    (cat, msg, opts) => logger._log("error", cat, msg, opts),
  critical: (cat, msg, opts) => logger._log("critical", cat, msg, opts),
};

export default logger;