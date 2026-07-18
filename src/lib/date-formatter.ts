export function formatDate12h(dateInput: Date | string | null | undefined, includeSeconds = true): string {
  if (!dateInput) return "N/A";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "N/A";
    
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    };
    
    if (includeSeconds) {
      options.second = "2-digit";
    }
    
    const formatted = date.toLocaleString("en-GB", options);
    // Replace lowercase am/pm with uppercase AM/PM
    return formatted.replace(/am/i, "AM").replace(/pm/i, "PM");
  } catch (e) {
    console.error("Error formatting date:", e);
    return "N/A";
  }
}
