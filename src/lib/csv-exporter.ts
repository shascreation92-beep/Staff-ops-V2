export function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => 
      row.map(val => {
        const cleanVal = val === null || val === undefined ? "" : val.toString();
        if (cleanVal.includes(",") || cleanVal.includes('"') || cleanVal.includes("\n") || cleanVal.includes("\r")) {
          return `"${cleanVal.replace(/"/g, '""')}"`;
        }
        return cleanVal;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
