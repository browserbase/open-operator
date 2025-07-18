// Test the time conversion function
const formatTime = (timeStr) => {
  console.log(`Converting time: "${timeStr}"`);
  // Handle both 24-hour format (HH:MM) and existing formats with AM/PM
  const time24Match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (time24Match) {
    // Convert 24-hour format to 12-hour format with AM/PM
    const [, hours, minutes] = time24Match;
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const converted = `${hour12}:${minutes} ${period}`;
    console.log(`Converted 24-hour time "${timeStr}" to "${converted}"`);
    return converted;
  }
  
  // Handle existing format with AM/PM
  const match = timeStr.match(/(\d{1,2})(:?)(\d{0,2})\s*(AM|PM)?/i);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  const [, hours, , minutes = "00", period] = match;
  const hoursNum = parseInt(hours, 10);
  const finalPeriod = period ? period.toUpperCase() : (hoursNum >= 5 && hoursNum <= 11 ? "AM" : "PM");
  const result = `${hoursNum}:${minutes.padStart(2, '0')} ${finalPeriod}`;
  console.log(`Formatted time "${timeStr}" to "${result}"`);
  return result;
};

// Test with your example data
console.log("Testing time conversion with your example data:");
const startTime = "08:30";
const endTime = "16:30";

const formattedStartTime = formatTime(startTime);
const formattedEndTime = formatTime(endTime);

console.log(`\nResults:`);
console.log(`Start: "${startTime}" → "${formattedStartTime}"`);
console.log(`End: "${endTime}" → "${formattedEndTime}"`);
console.log(`Expected: "8:30 AM" and "4:30 PM"`);

// Test some edge cases
console.log("\nTesting edge cases:");
console.log(`12:00 → "${formatTime("12:00")}"`);
console.log(`00:00 → "${formatTime("00:00")}"`);
console.log(`13:45 → "${formatTime("13:45")}"`);
console.log(`23:59 → "${formatTime("23:59")}"`);
