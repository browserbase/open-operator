import puppeteer, { Browser, Page } from "puppeteer-core";
import Browserbase from "@browserbasehq/sdk";

// Type definitions for the form data
export interface FormData {
  companyCode: string;
  username: string;
  password: string;
  caseNumber: string;
  dateOfService: string;
  startTime: string;
  endTime: string;
  serviceTypeIdentifier: string;
  personServed: string;
  mileageStartAddress?: string;
  mileageStartMileage?: string;
  observationNotes56a?: ObservationNotes;
  endAddresses: string[];
  additionalDropdownValues: string[];
  noteSummary47e?: string;
}

export interface ObservationNotes {
  pickUpAddress?: string;
  locationAddress?: string;
  purposeOfTransportation?: string;
  delaysDescription?: string;
  interactionsWithParentGuardian?: string;
  interactionsWithClient?: string;
  clientDressedAppropriately?: string;
  concerns?: string;
}

interface ObservationNotesEntry {
  field: string;
  value: string;
}

interface ProcessedNoteData {
  dateOfService: string;
  startTime: string;
  endTime: string;
  mileage: number;
}

// Event emitter interface for progress updates
export interface ProgressEmitter {
  emit: (uid: string, event: string, data: unknown) => void;
}

export async function runPuppeteerScript(
  formData: FormData, 
  uid: string,
  sessionId: string,
  emitToUser?: (uid: string, event: string, data: unknown) => void
): Promise<void> {
  const {
    companyCode,
    username,
    password,
    caseNumber,
    dateOfService,
    startTime,
    endTime,
    serviceTypeIdentifier,
    personServed,
    mileageStartAddress,
    mileageStartMileage,
    observationNotes56a,
    endAddresses,
    additionalDropdownValues,
    noteSummary47e
  } = formData;

  // Default emitter if none provided
  const emit = emitToUser || (() => {});

  // Remove the local chromium path requirement since we're using Browserbase
  // const { stdout: chromiumPath } = await promisify(exec)("which chromium");

  const desiredOrder: (keyof ObservationNotes)[] = [
    'pickUpAddress',
    'locationAddress',
    'purposeOfTransportation',
    'delaysDescription',
    'interactionsWithParentGuardian',
    'interactionsWithClient',
    'clientDressedAppropriately',
    'concerns'
  ];

  // Reorder keys in the observation notes object
  const reorderObjectKeys = (obj: ObservationNotes = {}, order: (keyof ObservationNotes)[]): ObservationNotes => {
    const ordered: ObservationNotes = {};
    order.forEach(key => {
      ordered[key] = obj.hasOwnProperty(key) ? obj[key] : '';
    });
    return ordered;
  };

  const defaultTimeout = 30000;
  const orderedObservationNotes56a = reorderObjectKeys(observationNotes56a, desiredOrder);
  const observationNotesArray: ObservationNotesEntry[] = Object.entries(orderedObservationNotes56a).map(
    ([field, value]) => ({ field, value: value || '' })
  );

  // Simple sleep function
  const sleep = (milliseconds: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

  // Format date to MM/DD/YY format
  const formatDateOutput = (dateStr: string): string => {
    if (typeof dateStr !== 'string') {
      throw new Error(`Invalid date format: expected a string, received ${typeof dateStr}`);
    }
    dateStr = dateStr.trim();
    console.log(`Received dateStr: "${dateStr}"`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      const formattedDate = `${month}/${day}/${year.slice(-2)}`;
      console.log(`Formatted date from YYYY-MM-DD to MM/DD/YY: "${formattedDate}"`);
      return formattedDate;
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let [month, day] = parts;
      const year = parts[2];
      if (
        isNaN(Number(month)) || isNaN(Number(day)) || isNaN(Number(year)) ||
        Number(month) < 1 || Number(month) > 12 ||
        Number(day) < 1 || Number(day) > 31 ||
        year.length !== 4
      ) {
        throw new Error(`Invalid date components in "${dateStr}"`);
      }
      month = month.padStart(2, '0');
      day = day.padStart(2, '0');
      const shortYear = year.slice(-2);
      const formattedDate = `${month}/${day}/${shortYear}`;
      console.log(`Formatted date from MM/DD/YYYY to MM/DD/YY: "${formattedDate}"`);
      return formattedDate;
    }
    throw new Error(`Invalid date format: expected "MM/DD/YYYY" or "YYYY-MM-DD", check the Date of Service`);
  };

  const formattedDate = formatDateOutput(dateOfService);

  // Format time to "h:mm AM/PM" format
  const formatTime = (timeStr: string): string => {
    const match = timeStr.match(/(\d{1,2})(:?)(\d{0,2})\s*(AM|PM)?/i);
    if (!match) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }
    const [, hours, , minutes = "00", period] = match;
    const hoursNum = parseInt(hours, 10);
    const finalPeriod = period ? period.toUpperCase() : (hoursNum >= 5 && hoursNum <= 11 ? "AM" : "PM");
    return `${hoursNum}:${minutes.padStart(2, '0')} ${finalPeriod}`;
  };

  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);
  const targetServiceTime = `${formattedStartTime} to ${formattedEndTime}`;

  // Selector templates for mileage fields
  const mileageEndAddressSelectorTemplate = (index: number): string =>
    `#DataModels_${index.toString().padStart(2, '0')}__EndAddress`;

  const additionalDropdownSelectorTemplate = (index: number): string =>
    `#DataModels_${index.toString().padStart(2, '0')}__PurposeOfTripId`;

  // Function to populate the start address and mileage
  const populateStartDetails = async (
    page: Page, 
    address: string, 
    mileage: string, 
    mileageStartAddressSelector: string, 
    mileageStartMileageSelector: string
  ): Promise<void> => {
    try {
      await sleep(1000);
      await page.click('#addButton');

      await page.waitForSelector(mileageStartAddressSelector);
      await clearAndType(page, mileageStartAddressSelector, address);
      console.log(`Entered Start Address: "${address}"`);
      await page.waitForSelector(mileageStartMileageSelector);
      await clearAndType(page, mileageStartMileageSelector, mileage);
      console.log(`Entered Start Mileage: "${mileage}"`);
    } catch (error) {
      emit(uid, 'error', `Error populating Start Address and Start Mileage: ${error}`);
      console.error("Error populating Start Address and Start Mileage:", error);
      isBrowserClosed = true;
      await browser.close();
      throw error;
    }
  };

  const getLastEndMileageValue = async (page: Page): Promise<string | null> => {
    try {
      const endMileageSelector = "#data-models-table-body input[id*='__EndMileage']";
      await page.waitForSelector(endMileageSelector, { visible: true, timeout: defaultTimeout });
      const endMileageElements = await page.$$(endMileageSelector);
      if (endMileageElements.length === 0) {
        console.warn("No 'End Mileage' input fields found.");
        return null;
      }
      const lastEndMileageElement = endMileageElements[endMileageElements.length - 1];
      const endMileageValue = await page.evaluate(el => (el as HTMLInputElement).value, lastEndMileageElement);
      return endMileageValue;
    } catch (error) {
      console.error("Error retrieving the last 'End Mileage' value:", error);
      return null;
    }
  };

  const clearAndType = async (page: Page, selector: string, text: string): Promise<void> => {
    let retries = 3;
    while (retries > 0) {
      try {
        const textArea = await page.$(selector);
        if (!textArea) {
          throw new Error(`Selector "${selector}" not found.`);
        }
        
        // Method 1: Focus, select all, and replace (fastest while still clearing properly)
        await page.evaluate((selector, text) => {
          const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
          if (element) {
            element.focus();
            element.select(); // Select all existing text
            element.value = ''; // Clear the value
            element.value = text; // Set new value
            // Trigger events to notify the page
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur(); // Remove focus
          }
        }, selector, text);
        
        console.log(`Cleared and set value for "${selector}": "${text}"`);
        return; // Success, exit the retry loop
      } catch (error) {
        retries--;
        if (error instanceof Error && error.message.includes('Target closed')) {
          console.warn(`Target closed error for selector "${selector}", retries left: ${retries}`);
          if (retries > 0) {
            await sleep(2000); // Wait before retry
            continue;
          }
        }
        
        // Fallback to keyboard-based clearing and typing if direct setting fails
        try {
          const textArea = await page.$(selector);
          if (!textArea) {
            throw new Error(`Selector "${selector}" not found.`);
          }
          await textArea.focus();
          const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));
          if (isMac) {
            await page.keyboard.down('Meta');
          } else {
            await page.keyboard.down('Control');
          }
          await page.keyboard.press('A');
          await page.keyboard.up(isMac ? 'Meta' : 'Control');
          await page.keyboard.press('Backspace');
          console.log(`Cleared existing text in "${selector}".`);
          
          // Use faster typing with minimal delay
          await textArea.type(text, { delay: 0 });
          console.log(`Typed into "${selector}": "${text}"`);
          return;
        } catch (fallbackError) {
          emit(uid, 'error', `Error in clearAndType for selector: ${fallbackError}`);
          console.error(`Error in clearAndType for selector "${selector}":`, fallbackError);
          isBrowserClosed = true;
          await browser.close();
          throw fallbackError;
        }
      }
    }
  };

  const sanitizeTime = (timeStr: string): string => {
    return timeStr.replace(/\s+/g, '');
  };

  const processMileageTable = async (page: Page): Promise<void> => {
    const tableSelector = '#searchResultsTable';
    const noTripsMessageSelector = '.alert.alert-subtle-info.p-2';
    emit(uid, 'progress', 'Processing Mileage Table...');

    try {
      await sleep(4500);

      const raceResult = await Promise.race([
        page.waitForSelector(tableSelector, { visible: true, timeout: 3000 }).then(() => 'table'),
        page.waitForSelector(noTripsMessageSelector, { visible: true, timeout: 3000 }).then(() => 'message'),
        new Promise<string>(resolve => setTimeout(() => resolve('timeout'), 3000))
      ]);

      if (raceResult === 'table') {
        console.log('Mileage table found.');
        const rowSelector = '#data-models-table-body tr';

        while (true) {
          const rows = await page.$$(rowSelector);
          if (rows.length === 0) {
            console.log('No mileage entries found. Exiting deletion loop.');
            break;
          }
          console.log(`Processing deletion for ${rows.length} remaining row(s).`);
          const row = rows[0];

          const dropdownToggle = await row.$('td.min a.dropdown');
          if (!dropdownToggle) {
            console.warn('Dropdown toggle not found in the first row. Skipping deletion.');
            break;
          }
          await dropdownToggle.click();

          const deleteButtonSelector = '.dropdown-item.confirm-delete';
          const deleteButton = await row.waitForSelector(deleteButtonSelector, { visible: true, timeout: defaultTimeout });
          if (!deleteButton) {
            console.warn('Delete button not found in the first row.');
            break;
          }
          await deleteButton.click();
          console.log('Clicked delete for the first row.');

          await page.waitForSelector('#confirmationOkButton', { visible: true, timeout: defaultTimeout });
          await sleep(1500);
          await page.click('#confirmationOkButton');

          await page.waitForFunction(() => {
            const toastContainer = document.getElementById("toast-container");
            if (!toastContainer) return false;
            const toastMessage = toastContainer.querySelector(".toast-message");
            return toastMessage && toastMessage.textContent?.includes("Changes saved successfully.");
          }, { timeout: defaultTimeout });
          console.log('Deletion confirmed via toast message.');
          await sleep(1500);
        }
      } else if (raceResult === 'message') {
        console.log('"No trips found" message found. Proceeding to add new mileage.');
        return;
      } else {
        console.error('Neither mileage table nor "No trips found" message found within the timeout.');
        throw new Error('Mileage table or "No trips found" message not found within the timeout.');
      }
    } catch (error) {
      console.error('An error occurred:', (error as Error).message);
      throw error;
    }
  };

  const populateMileageEntries = async (page: Page, endAddresses: string[], additionalDropdownValues: string[]): Promise<void> => {
    for (let i = 0; i < endAddresses.length; i++) {
      const endAddress = endAddresses[i];
      const additionalValue = additionalDropdownValues[i];
      const mileageEndAddressSelector = mileageEndAddressSelectorTemplate(i);
      const additionalDropdownSelector = additionalDropdownSelectorTemplate(i);

      try {
        if (i > 0) {
          const newMileageButtonSelector = "#addButton";
          await page.waitForSelector(newMileageButtonSelector, { visible: true, timeout: defaultTimeout });
          await page.click(newMileageButtonSelector);
          console.log(`Clicked on "New" button to add mileage entry ${i}`);
          await sleep(1200);
        }

        await page.waitForSelector(mileageEndAddressSelector, { visible: true, timeout: defaultTimeout });
        console.log(`End Address input is present in the DOM for entry (${i}).`);
        await clearAndType(page, mileageEndAddressSelector, endAddress);
        console.log(`Entered End Address (${i}): "${endAddress}"`);
        await sleep(1000);

        const availableOptions = await page.evaluate((selector) => {
          const select = document.querySelector(selector) as HTMLSelectElement;
          if (!select) throw new Error(`Selector "${selector}" not found.`);
          return Array.from(select.options).map(option => option.textContent?.trim() || '');
        }, additionalDropdownSelector);
        console.log(`Available options for Purpose of Trip (${i}):`, availableOptions);

        const additionalDropdownSelected = await page.evaluate((selector, value) => {
          const select = document.querySelector(selector) as HTMLSelectElement;
          if (!select) throw new Error(`Selector "${selector}" not found.`);
          const normalizedValue = value.trim().toLowerCase();
          const matchingOption = Array.from(select.options).find(option =>
            option.textContent?.trim().toLowerCase().includes(normalizedValue)
          );
          if (matchingOption) {
            select.value = matchingOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          } else {
            console.warn(`No matching option found for additional dropdown value: "${value}"`);
            return false;
          }
        }, additionalDropdownSelector, additionalValue);
        await sleep(1000);
        
        if (additionalDropdownSelected) {
          console.log(`Selected additional dropdown value: "${additionalValue}" for End Address (${i})`);
        } else {
          console.log(`Failed to select additional dropdown value: "${additionalValue}" for End Address (${i})`);
        }

        const getMapButtonSelector = `#data-models-table-body tr:nth-child(${i + 1}) button.btn.btn-subtle-primary.text-nowrap`;
        await page.waitForSelector(getMapButtonSelector, { visible: true, timeout: defaultTimeout });
        await page.click(getMapButtonSelector);
        console.log(`Clicked on the "Get Map" button for End Address (${i})`);

        await sleep(1500);
        try {
          await page.waitForFunction(() => {
            const toastContainer = document.getElementById("toast-container");
            if (!toastContainer) return false;
            const toastMessage = toastContainer.querySelector(".toast-message");
            return toastMessage && toastMessage.textContent?.includes("Changes saved successfully.");
          }, { timeout: defaultTimeout });
          console.log("Mileage saved successfully (toast message appeared).");
        } catch {
          console.error("Timeout waiting for mileage save confirmation toast message.");
        }
        await sleep(100);
        
        if (i === endAddresses.length - 1) {
          const endMileageValue = await getLastEndMileageValue(page);
          if (endMileageValue !== null) {
         
            console.log(`End Mileage value for the last entry is: "${endMileageValue}"`);
            // Note: upsertProcessedNoteHistory would need to be implemented separately
            emit(uid, 'miles', ` [${dateOfService}] [${startTime}] [${endTime}] [${endMileageValue}]`);
          } else {
            console.log(`End Mileage input not found for the last entry.`);
          }
        }
      } catch (error) {
        console.error(`Error populating mileage entry (${i}):`, error);
        isBrowserClosed = true;
        await browser.close();
        throw error;
      }
    }
  };

  let isBrowserClosed = false;
  let browser: Browser;
  let keepAliveInterval: NodeJS.Timeout | null = null;

  // Connect to the existing Browserbase session instead of launching local browser
  try {
    console.log(`Connecting to Browserbase session: ${sessionId}`);
    
    // Get the session details from Browserbase
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    });
    
    const session = await bb.sessions.retrieve(sessionId);
    
    if (!session.connectUrl) {
      throw new Error(`Session ${sessionId} does not have a valid connect URL`);
    }
    
    // Connect to the existing session
    browser = await puppeteer.connect({
      browserWSEndpoint: session.connectUrl,
      defaultViewport: null, // Use the session's viewport
    });
    
    console.log(`Successfully connected to Browserbase session: ${sessionId}`);
  } catch (error) {
    console.error(`Failed to connect to Browserbase session ${sessionId}:`, error);
    throw new Error(`Failed to connect to browser session: ${error}`);
  }

  console.log("addresses", endAddresses);
  
  // Get the existing page instead of creating a new one
  const pages = await browser.pages();
  let page: Page;
  
  if (pages.length > 0) {
    page = pages[0];
    console.log("Using existing page from browser session");
  } else {
    page = await browser.newPage();
    console.log("Created new page in browser session");
  }
  
  // Verify the page is still active
  try {
    await page.url();
    console.log("Page is accessible and ready");
  } catch (error) {
    console.error("Page is not accessible:", error);
    throw new Error("Browser page is not accessible");
  }

  const findAndClickEdit = async (page: Page, targetDate: string, targetTime: string): Promise<boolean> => {
    console.log(`Searching for Date: "${targetDate}" and Time: "${targetTime}"...`);
    await page.waitForSelector("#data-models-table-body tr", { timeout: defaultTimeout });

    const found = await page.evaluate((targetDate, targetTime) => {
      const convertDate = (dateStr: string): string => dateStr.slice(0, 6) + dateStr.slice(-2);
      const normalizedTargetDate = convertDate(targetDate.trim());

      const normalizeTime = (time: string): string => time.replace(/\s+/g, '').toUpperCase();
      const normalizedTargetTime = normalizeTime(targetTime.trim());

      const rows = Array.from(document.querySelectorAll("#data-models-table-body tr"));
      for (let row of rows) {
        const dateCell = row.querySelector("td.sort-DateOfService") as HTMLElement;
        const timeCell = row.querySelector("td.sort-TimeDisplay") as HTMLElement;
        if (dateCell && timeCell) {
          const rowDate = dateCell.textContent?.trim() || '';
          const rowTime = normalizeTime(timeCell.textContent?.trim() || '');
          if (rowDate === normalizedTargetDate && rowTime === normalizedTargetTime) {
            const clickableLink = dateCell.querySelector("span.text-nowrap a") as HTMLElement;
            if (clickableLink) {
              clickableLink.click();
              return true;
            }
          }
        }
      }
      return false;
    }, targetDate, targetTime);

    if (found) {
      console.log(`Successfully clicked the date link for Date: "${targetDate}" and Time: "${targetTime}".`);
    } else {
      console.log(`Date link for Date: "${targetDate}" and Time: "${targetTime}" was not found.`);
    }
    return found;
  };

  const saveAndReadyNote = async (): Promise<void> => {
    try {
      emit(uid, 'progress', 'Saving Note');
      const saveNoteSelector = "#saveButton";
      await page.waitForSelector(saveNoteSelector, { visible: true, timeout: defaultTimeout });
      await page.click(saveNoteSelector);
      console.log("Clicked on Save Note");

      const saveNoteModalSelector = "#saveNoteConfirmationModal";
      let isSaveNoteModalVisible = false;
      try {
        await page.waitForSelector(saveNoteModalSelector, { visible: true, timeout: 1000 });
        isSaveNoteModalVisible = true;
        console.log("Save Note modal is visible");
      } catch (modalError) {
        console.log("Save Note modal did not appear");
      }

      if (isSaveNoteModalVisible) {
        const saveOnlyButtonSelector = "#saveNoteConfirmationModal .btn-subtle-success";
        await page.waitForSelector(saveOnlyButtonSelector, { visible: true, timeout: defaultTimeout });
        await page.click(saveOnlyButtonSelector);
        console.log("Clicked on 'Save and Ready' button");
      }

      try {
        await page.waitForFunction(() => {
          const toastContainer = document.getElementById("toast-container");
          if (!toastContainer) return false;
          const toastMessage = toastContainer.querySelector(".toast-title");
          return toastMessage && toastMessage.textContent?.includes("Success");
        }, { timeout: defaultTimeout });
        console.log("Save confirmation received: 'Saved Successfully!'");
        emit(uid, 'success', 'Note Saved Successfully!');
        emit(uid, 'toast', 'Note Saved Successfully!');
      } catch (toastError) {
        console.log("Toast message did not appear.");
      }
    } catch (error) {
      emit(uid, 'error', `An error occurred while saving and readying the note: ${error}`);
      console.error("An error occurred while saving and readying the note:", error);
      isBrowserClosed = true;
      await browser.close();
      throw error;
    }
  };

  try {
    console.log("addresses", endAddresses);
    
    // Keep the session alive by taking a screenshot periodically
    keepAliveInterval = setInterval(async () => {
      try {
        if (!isBrowserClosed && page) {
          await page.evaluate(() => document.title); // Simple check to keep connection alive
        }
      } catch (error) {
        console.warn("Keep-alive check failed:", error);
      }
    }, 30000); // Every 30 seconds
    
    await page.goto("https://portal.ecasenotes.com", { waitUntil: "networkidle2" });

    emit(uid, 'success', 'Ecasenotes reached');
    emit(uid, 'progress', 'Signing In...');
    
    console.log(additionalDropdownValues);
    await page.waitForSelector("#Company", { visible: true, timeout: defaultTimeout });
    console.log("Company Code input is visible.");
    await page.waitForSelector("#Email", { visible: true, timeout: defaultTimeout });
    console.log("Email input is visible.");
    await page.waitForSelector("#Password", { visible: true, timeout: defaultTimeout });
    console.log("Password input is visible.");
    
    await clearAndType(page, "#Company", companyCode);
    await clearAndType(page, "#Email", username);
    await clearAndType(page, "#Password", password);
    
    await page.click(".btn.btn-subtle-primary.w-100.mb-3");
    
    emit(uid, 'success', 'Login successful!');
    console.log("Login successful and dashboard loaded");
    emit(uid, 'progress', 'Fetching Notes!');

    await page.waitForSelector('a[href="/cases"]', { visible: true, timeout: defaultTimeout });
    await page.click('a[href="/cases"]');

    console.log("Navigated to Cases & Notes");
    await sleep(200);
    
    await page.waitForSelector('#SearchCriteria_CaseHeaderNumber', { visible: true, timeout: defaultTimeout });
    await page.type('#SearchCriteria_CaseHeaderNumber', caseNumber, { delay: 0 });

    console.log("Cases & Notes page loaded successfully");
    await page.click("#searchButton");
    console.log("Clicked the Search button");
    await sleep(1000);
    
    await page.waitForSelector(".sort-CaseNumber", { visible: true });
    console.log("Case results loaded");
    
    await page.evaluate((caseNumber) => {
      const caseLink = Array.from(document.querySelectorAll('.sort-CaseNumber')).find(el => el.textContent?.trim() === caseNumber) as HTMLElement;
      if (caseLink) {
        caseLink.click();
      } else {
        throw new Error('Case number not found');
      }
    }, caseNumber);
    
    console.log(`Clicked on case number ${caseNumber}`);
    
    await page.waitForSelector("#pageTabs", { visible: true });
    await page.evaluate(() => {
      const pageTabs = document.querySelector('#pageTabs');
      if (!pageTabs) {
        throw new Error('pageTabs element not found');
      }
      const caseNotesLink = pageTabs.querySelector('a[href*="/dfcs/notes"]') as HTMLElement;
      if (caseNotesLink) {
        caseNotesLink.click();
      } else {
        throw new Error('Case Notes link not found within pageTabs');
      }
    });
    
    console.log(`Clicked on "Case Notes" link for case number ${caseNumber}`);

    let noteExists = await findAndClickEdit(page, formattedDate, targetServiceTime);
    if (noteExists) {
      console.log(`A note for Date: "${formattedDate}" and Time: "${targetServiceTime}" already exists. Skipping creation.`);
      emit(uid, 'progress', 'An existing Note has been found!');
    } else {
      console.log(`No existing note found for Date: "${formattedDate}" and Time: "${targetServiceTime}". Proceeding to create a new note.`);
      emit(uid, 'progress', 'Creating a new note!');
      await sleep(200);
      emit(uid, 'progress', 'Creating Note!');

      await page.click("#addButton");
      console.log("Clicked on New Note to create a new case note");

      await page.waitForSelector("#DataModel_DateOfService", { visible: true });
      console.log("New Note modal appeared");

      await page.evaluate((formattedDate) => {
        const dateInput = document.getElementById("DataModel_DateOfService") as HTMLInputElement;
        if (dateInput) {
          dateInput.value = formattedDate;
          dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          throw new Error("Date of Service input not found");
        }
      }, dateOfService);

      console.log(`Date of Service set to ${dateOfService}`);
      
      await sleep(100);
      const sanitizedStartTime = sanitizeTime(formattedStartTime);
      const sanitizedEndTime = sanitizeTime(formattedEndTime);
      await page.type("#DataModel_StartTime", sanitizedStartTime, { delay: 0 });
      console.log(`Start Time set to "${sanitizedStartTime}"`);
      await page.type("#DataModel_EndTime", sanitizedEndTime, { delay: 0 });
      console.log(`End Time set to "${sanitizedEndTime}"`);
      
      await page.waitForFunction(() => {
        const selectElement = document.getElementById("DataModel_ServiceTypeId") as HTMLSelectElement;
        return selectElement && selectElement.options.length > 1;
      });
      
      console.log("Service type options loaded");
      await page.evaluate((serviceTypeIdentifier) => {
        const selectElement = document.getElementById("DataModel_ServiceTypeId") as HTMLSelectElement;
        const options = Array.from(selectElement.options);
        const matchingOption = options.find(option =>
          option.textContent?.toLowerCase().includes(serviceTypeIdentifier.toLowerCase())
        );
        
        if (matchingOption) {
          selectElement.value = matchingOption.value;
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          throw new Error(`Service type with identifier "${serviceTypeIdentifier}" not found`);
        }
      }, serviceTypeIdentifier);
      console.log(`Service type set to option containing identifier "${serviceTypeIdentifier}"`);

      await page.waitForFunction(() => {
        const selectElement = document.getElementById("DataModel_CaseApprovedHourChildId") as HTMLSelectElement;
        return selectElement && selectElement.options.length > 1;
      });

      await page.evaluate((personServed) => {
        const selectElement = document.getElementById("DataModel_CaseApprovedHourChildId") as HTMLSelectElement;
        const options = Array.from(selectElement.options);
        const matchingOption = options.find(option =>
          option.textContent?.toLowerCase().includes(personServed.toLowerCase())
        );
        if (matchingOption) {
          selectElement.value = matchingOption.value;
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          throw new Error(`Person served "${personServed}" not found`);
        }
      }, personServed);
      console.log(`Person served set to "${personServed}"`);

      await page.waitForSelector("#saveButton", { visible: true });
      await page.click("#saveButton");
      await sleep(500);

      emit(uid, 'success', 'Note Created!');
      emit(uid, 'toast', 'Note Created!');
    }
    
    emit(uid, 'progress', 'Proceeding to edit Note!');
    emit(uid, 'progress', 'Making observations!');

    console.log('original', observationNotes56a);
    console.log('formatted', observationNotesArray);
    
    if (serviceTypeIdentifier.toLowerCase() === "56a") {
      console.log('Service Type Identifier is "56a". Populating observation notes.');
      for (let i = 0; i <= observationNotesArray.length - 1; i++) {
        const { field, value } = observationNotesArray[i];
        const textareaSelector = `#NewNoteValues_${i}__0_`;
        try {
          await page.waitForSelector(textareaSelector, { visible: true, timeout: defaultTimeout });
          emit(uid, 'progress', `Populating ${field} with content: "${value}"`);
          console.log(`Populating ${field} with content: "${value}"`);
          await clearAndType(page, textareaSelector, value);
        } catch (error) {
          emit(uid, 'error', `Failed to populate ${field} with selector "${textareaSelector}": ${error}`);
          console.error(`Failed to populate ${field} with selector "${textareaSelector}":`, error);
          isBrowserClosed = true;
          await browser.close();
          throw error;
        }
      }
    } else if (serviceTypeIdentifier.toLowerCase() === "47e") {
      console.log('Service Type Identifier is "47e". Populating Note Summary.');
      emit(uid, 'progress', `Populating Note Summary.`);
      const textareaSelector = `#NewNoteValues_0__0_`;
      const noteContent = noteSummary47e || '';
      try {
        await page.waitForSelector(textareaSelector, { visible: true, timeout: defaultTimeout });
        await clearAndType(page, textareaSelector, noteContent);
        console.log(`Populated Note Summary: "${noteContent}"`);
      } catch (error) {
        emit(uid, 'error', `Failed to populate Note Summary with selector "${textareaSelector}": ${error}`);
        console.error(`Failed to populate Note Summary with selector "${textareaSelector}":`, error);
        isBrowserClosed = true;
        await browser.close();
        throw error;
      }
    } else {
      console.log('Service Type Identifier is neither "56a" nor "47e". Skipping observation notes population.');
    }

    console.log("ready to save the note");
    await saveAndReadyNote();

    if (mileageStartAddress && mileageStartAddress.trim() !== '') {
      emit(uid, 'progress', `Processing Mileage Trip Segments`);
      const pageTabs = await page.$("#pageTabs");

      await page.evaluate((pageTabs) => {
        if (!pageTabs) {
          throw new Error('pageTabs element not found');
        }
        const mileageTabLink = pageTabs.querySelector('a[href*="/dfcs/notes/trips"]') as HTMLElement;
        if (mileageTabLink) {
          mileageTabLink.click();
        } else {
          throw new Error('Mileage tab link not found within pageTabs');
        }
      }, pageTabs);
      console.log("Navigated to Mileage Tab");

      const mileageTabSelector = 'a[href*="/dfcs/notes/trips"]';
      await page.waitForSelector(mileageTabSelector, { visible: true, timeout: defaultTimeout });
      await page.click(mileageTabSelector);
      console.log('Clicked on the "Mileage" tab');

      await processMileageTable(page);

      const mileageStartAddressSelector = "#DataModels_0__StartAddress";
      const mileageStartMileageSelector = "#DataModels_0__StartMileage";
      await populateStartDetails(page, mileageStartAddress, mileageStartMileage || '', mileageStartAddressSelector, mileageStartMileageSelector);
      
      console.log("entering end addresses");
      await sleep(1000);
      await populateMileageEntries(page, endAddresses, additionalDropdownValues);
      await saveAndReadyNote();
      
      await page.waitForSelector("#ctl00_UpdateProgressDisplay", { hidden: true, timeout: defaultTimeout });
      console.log("Mileage Successfully Saved!");
      emit(uid, 'toast', 'Mileage Saved Successfully!');
      emit(uid, 'finished', 'Process Completed!');
      emit(uid, 'toast', 'Process Completed!');
    } else {
      console.log('Include Mileage is false. Skipping mileage processing.');
      emit(uid, 'finished', 'Process Completed!');
      emit(uid, 'toast', 'Process Completed!');
    }
    
    await browser.close();

  } catch (error) {
    // Clear the keep-alive interval
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    
    emit(uid, 'error', `An unexpected error occurred: ${error}`);
    console.error("An unexpected error occurred:", error);
    
    try {
      let screenshot3 = await page.screenshot({ encoding: 'base64', type: 'png' });
      const mimeType = 'image/png';
      emit(uid, 'screenshot', { mimeType, data: screenshot3 });
    } catch (screenshotError) {
      console.error("Failed to take error screenshot:", screenshotError);
    }
    
    isBrowserClosed = true;
    await browser.close();
    throw error;

  } finally {
    // Clear the keep-alive interval
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    
    isBrowserClosed = true;
    if (browser && !isBrowserClosed) {
      await browser.close();
    }
    console.log("Browser closed");
  }
}

export default runPuppeteerScript;
