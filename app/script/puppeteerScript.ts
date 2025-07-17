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

  const defaultTimeout = 15000; // Reduced from 30s to 15s
  const shortTimeout = 5000; // For quick operations
  const mediumTimeout = 10000; // For medium operations
  const orderedObservationNotes56a = reorderObjectKeys(observationNotes56a, desiredOrder);
  const observationNotesArray: ObservationNotesEntry[] = Object.entries(orderedObservationNotes56a).map(
    ([field, value]) => ({ field, value: value || '' })
  );

  // Simple sleep function
  const sleep = (milliseconds: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

  // Human-like typing function for sensitive inputs
  const humanLikeType = async (page: Page, selector: string, text: string): Promise<void> => {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Selector "${selector}" not found.`);
    }
    
    await element.focus();
    
    // Clear existing content
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await sleep(30);
    await page.keyboard.press('Backspace');
    
    // Type each character with human-like timing
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      await page.keyboard.type(char, { delay: 0 });
      
      // Vary typing speed: 
      // - Faster for common characters
      // - Slower for numbers/special characters
      // - Occasional longer pauses to simulate thinking
      let delay;
      if (/[a-z]/i.test(char)) {
        delay = Math.floor(Math.random() * 50) + 25; // 25-75ms for letters
      } else if (/[0-9]/.test(char)) {
        delay = Math.floor(Math.random() * 80) + 40; // 40-120ms for numbers
      } else {
        delay = Math.floor(Math.random() * 100) + 60; // 60-160ms for special chars
      }
      
      // Occasional longer pauses (simulate thinking/checking)
      if (Math.random() < 0.1) {
        delay += Math.floor(Math.random() * 200) + 100; // Add 100-300ms occasionally
      }
      
      await sleep(delay);
    }
    
    // Trigger events
    await page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLInputElement;
      if (element) {
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
      }
    }, selector);
  };

  // Optimized selector validation - checks multiple selectors in parallel
  const waitForAnySelector = async (page: Page, selectors: string[], timeout: number = shortTimeout): Promise<string | null> => {
    try {
      const promises = selectors.map(selector => 
        page.waitForSelector(selector, { visible: true, timeout }).then(() => selector).catch(() => null)
      );
      const results = await Promise.allSettled(promises);
      const found = results.find(result => result.status === 'fulfilled' && result.value);
      return found?.status === 'fulfilled' ? found.value : null;
    } catch {
      return null;
    }
  };

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
    `#DataModels_${index}__EndAddress`;

  const additionalDropdownSelectorTemplate = (index: number): string =>
    `#DataModels_${index}__PurposeOfTripId`;

  // Function to populate the start address and mileage
  const populateStartDetails = async (
    page: Page, 
    address: string, 
    mileage: string, 
    mileageStartAddressSelector: string, 
    mileageStartMileageSelector: string
  ): Promise<void> => {
    try {
      await sleep(200); // Reduced from 1000ms
      await page.click('#addButton');

      await page.waitForSelector(mileageStartAddressSelector);
      await clearAndType(page, mileageStartAddressSelector, address);
      console.log(`Entered Start Address: "${address}"`);
      await page.waitForSelector(mileageStartMileageSelector);
      await humanLikeType(page, mileageStartMileageSelector, mileage);
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

  // Optimized clearAndType function with human-like typing for number inputs
  const clearAndType = async (page: Page, selector: string, text: string): Promise<void> => {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: shortTimeout });
      
      // Check if it's a number input field
      const elementType = await page.evaluate((selector) => {
        const el = document.querySelector(selector) as HTMLInputElement;
        return el ? el.type : null;
      }, selector);
      
      // For number inputs, use human-like typing to avoid detection
      if (elementType === 'number') {
        console.log(`Detected number input for "${selector}", using human-like typing`);
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Selector "${selector}" not found.`);
        }
        
        await element.focus();
        
        // Clear existing content with human-like selection
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await sleep(10); // Small pause like a human
        await page.keyboard.press('Backspace');
        
        // Type each character with human-like variations in timing
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          await page.keyboard.type(char, { delay: 0 });
          // Random delays between 30-120ms to simulate human typing
          const randomDelay = Math.floor(Math.random() * 90) + 30;
          await sleep(randomDelay);
        }
        
        // Trigger events to ensure proper form handling
        await page.evaluate((selector) => {
          const element = document.querySelector(selector) as HTMLInputElement;
          if (element) {
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
          }
        }, selector);
        
        console.log(`Human-like typed number into "${selector}": "${text}"`);
        return;
      }
      
      // For non-number inputs, use the fastest method: direct value setting
      const success = await page.evaluate((selector, text) => {
        const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
        if (element) {
          element.focus();
          element.value = text;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.blur();
          return true;
        }
        return false;
      }, selector, text);
      
      if (success) {
        console.log(`Fast input for "${selector}": "${text}"`);
        return;
      }
    } catch (error) {
      console.warn(`Fast method failed for "${selector}", using fallback`);
    }
    
    // Fallback to keyboard method only if needed
    try {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Selector "${selector}" not found.`);
      }
      
      await element.focus();
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await element.type(text, { delay: 1 }); // Very fast typing for fallback
      console.log(`Fallback typed into "${selector}": "${text}"`);
    } catch (fallbackError) {
      emit(uid, 'error', `Error in clearAndType for selector: ${fallbackError}`);
      console.error(`Error in clearAndType for selector "${selector}":`, fallbackError);
      throw fallbackError;
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
      await sleep(2000); // Reduced from 4500ms

      // Debug: Check what elements are actually present on the page
      const pageContent = await page.evaluate(() => {
        const elements = {
          searchResultsTable: !!document.querySelector('#searchResultsTable'),
          alertInfo: !!document.querySelector('.alert.alert-subtle-info.p-2'),
          allAlerts: Array.from(document.querySelectorAll('.alert')).map(el => ({
            className: el.className,
            text: el.textContent?.trim().substring(0, 100) || '',
            visible: (el as HTMLElement).offsetParent !== null
          })),
          allTables: Array.from(document.querySelectorAll('table')).map(el => el.id || el.className),
          bodyText: document.body.innerText.substring(0, 500)
        };
        return elements;
      });
      

      // First, check if any alerts contain "no trips" message
      const noTripsAlert = await page.evaluate(() => {
        const alerts = document.querySelectorAll('.alert');
        for (const alert of alerts) {
          const text = alert.textContent?.toLowerCase() || '';
          if (text.includes('no trips') || text.includes('no data') || text.includes('empty')) {
            return {
              found: true,
              text: alert.textContent?.trim() || '',
              className: alert.className
            };
          }
        }
        return { found: false };
      });

      if (noTripsAlert.found) {
        console.log(`Found "no trips" message: "${noTripsAlert.text}"`);
        return;
      }

      // If no "no trips" message, try to wait for table or specific alert
      const raceResult = await Promise.race([
        page.waitForSelector(tableSelector, { visible: true, timeout: 8000 }).then(() => 'table'),
        page.waitForSelector(noTripsMessageSelector, { visible: true, timeout: 8000 }).then(() => 'message'),
        new Promise<string>(resolve => setTimeout(() => resolve('timeout'), 8000))
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
          await sleep(700); // Reduced from 1500ms
          await page.click('#confirmationOkButton');

          await page.waitForFunction(() => {
            const toastContainer = document.getElementById("toast-container");
            if (!toastContainer) return false;
            const toastMessage = toastContainer.querySelector(".toast-message");
            return toastMessage && toastMessage.textContent?.includes("Changes saved successfully.");
          }, { timeout: defaultTimeout });
          console.log('Deletion confirmed via toast message.');
          await sleep(700); // Reduced from 1500ms
        }
      } else if (raceResult === 'message') {
        console.log('"No trips found" message found. Proceeding to add new mileage.');
        return;
      } else {
        // Timeout occurred, try alternative approaches
        emit(uid, 'progress', 'Timeout occurred, checking for alternative elements...');
        
        // Check for alternative "no trips" message patterns
        const alternativeNoTripsSelectors = [
          '.alert-info',
          '.alert.alert-info',
          '.alert-warning',
          '.alert.alert-warning',
          '[class*="alert"][class*="info"]',
          '[class*="no-trips"]',
          '[class*="empty"]'
        ];
        
        let foundAlternative = false;
        for (const selector of alternativeNoTripsSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const text = await page.evaluate(el => el.textContent?.toLowerCase() || '', element);
              if (text.includes('no trips') || text.includes('no data') || text.includes('empty')) {
                console.log(`Found alternative "no trips" message with selector: ${selector}`);
                foundAlternative = true;
                return;
              }
            }
          } catch (e) {
         
          }
        }
        
        if (!foundAlternative) {
          console.error('Neither mileage table nor "No trips found" message found within the timeout.');
          console.error('Page debug info:', pageContent);
          throw new Error('Mileage table or "No trips found" message not found within the timeout.');
        }
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
        await sleep(200); // Reduced from 1000ms
        console.log(`Entered End Address (${i}): "${endAddress}"`);
        await sleep(300); // Reduced from 1000ms

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
        // Click the mileage confirmation modal continue button only on the first Get Map attempt
        const mileageContinueSelector = "#getMileageContinueButton";
        if (i === 0) {
          try {
            await page.waitForSelector(mileageContinueSelector, { visible: true, timeout: 2000 });
            await page.click(mileageContinueSelector);
            console.log("Clicked 'Continue' on mileage confirmation modal");
          } catch {
            // Skip if the confirmation button did not appear
          }
        }

        await sleep(800); // Reduced from 1500ms
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
        await sleep(50); // Reduced from 100ms
        
        if (i === endAddresses.length - 1) {
          const endMileageValue = await getLastEndMileageValue(page);
          if (endMileageValue !== null) {
            const captureTimestamp = new Date().toISOString();
            console.log(`End Mileage value for the last entry is: "${endMileageValue}"`);
            // Send mileage data with date, time, and capture timestamp for Firebase storage
            emit(uid, 'miles', {
              dateOfService,
              startTime,
              endTime,
              endMileage: endMileageValue,
              capturedAt: captureTimestamp
            });
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

  const checkForExistingNote = async (page: Page): Promise<boolean> => {
    try {
      emit(uid, 'progress', 'Checking for existing notes...');
      
      // Create search string in format: MM/DD/YY h:mmAM to h:mmAM
      const searchString = `${formattedDate} ${formattedStartTime} to ${formattedEndTime}`;
      console.log(`Searching for existing note with: "${searchString}"`);
      
      // Click on the filter/search input
      const searchInputSelector = '.form-control.search-input.search';
      await page.waitForSelector(searchInputSelector, { visible: true, timeout: defaultTimeout });
      await page.click(searchInputSelector);
      console.log('Clicked on search filter input');
      
      // Clear the input first
      await page.evaluate((selector) => {
        const input = document.querySelector(selector) as HTMLInputElement;
        if (input) {
          input.value = '';
          input.focus();
        }
      }, searchInputSelector);
      
      // Type the search string character by character to trigger proper events
      await page.type(searchInputSelector, searchString, { delay: 0 });
      console.log(`Typed search string: "${searchString}"`);
      
      // Trigger additional events that might be needed for the filter
      await page.evaluate((selector) => {
        const input = document.querySelector(selector) as HTMLInputElement;
        if (input) {
          // Trigger various events that might be needed
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
          input.dispatchEvent(new Event('search', { bubbles: true }));
        }
      }, searchInputSelector);
      
      // Wait for the table to load after filtering
      await sleep(800); // Reduced from 1500ms
      
      // Look for the first note link matching the pattern href="/DFCS/Notes/Note?id=..."
      const noteFound = await page.evaluate(() => {
        const noteLinks = document.querySelectorAll('a[href*="/DFCS/Notes/Note?id="]');
        if (noteLinks.length > 0) {
          const firstLink = noteLinks[0] as HTMLElement;
          firstLink.click();
          return true;
        }
        return false;
      });
      
      if (noteFound) {
        console.log('Found existing note, clicked on it');
        emit(uid, 'success', 'Found existing note!');
        return true;
      } else {
        console.log('No existing note found');
        return false;
      }
      
    } catch (error) {
      console.error('Error checking for existing note:', error);
      return false;
    }
  };

  const findAndClickEdit = async (page: Page, targetDate: string, targetTime: string): Promise<boolean> => {
    console.log(`Searching for Date: "${targetDate}" and Time: "${targetTime}"...`);
    // Attempt to find any data rows; if none appear, click 'New Note' to proceed
    try {
      await page.waitForSelector("#data-models-table-body tr", { timeout: defaultTimeout });
    } catch {
      console.log("No data rows found, proceeding to create a new note");
      emit(uid, 'progress', 'No existing entries found, will create new note');
      return false;
    }

    const found = await page.evaluate((targetDate, targetTime) => {
      const convertDate = (dateStr: string): string => dateStr.slice(0, 6) + dateStr.slice(-2);
      const normalizedTargetDate = convertDate(targetDate.trim());

      const normalizeTime = (time: string): string => time.replace(/\s+/g, '').toUpperCase();
      const normalizedTargetTime = normalizeTime(targetTime.trim());

      const rows = Array.from(document.querySelectorAll("#data-models-table-body tr"));
      for (const row of rows) {
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
      } catch {
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
      } catch {
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
    
    keepAliveInterval = setInterval(async () => {
      try {
        if (!isBrowserClosed && page) {
          await page.evaluate(() => document.title); // Simple check to keep connection alive
        }
      } catch (error) {
        console.warn("Keep-alive check failed:", error);
      }
    }, 20000); // Reduced from 30s to 20s for better responsiveness
    
    emit(uid, 'progress', 'Connecting to Ecasenotes...');
    // Use faster loading strategy
    await page.goto("https://portal.ecasenotes.com", { 
      waitUntil: "domcontentloaded", // Faster than networkidle2
      timeout: defaultTimeout 
    });

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
    await sleep(100); // Reduced from 200ms
    
    await page.waitForSelector('#SearchCriteria_CaseHeaderNumber', { visible: true, timeout: defaultTimeout });
    await page.type('#SearchCriteria_CaseHeaderNumber', caseNumber, { delay: 0 });

    console.log("Cases & Notes page loaded successfully");
    await page.click("#searchButton");
    console.log("Clicked the Search button");
    await sleep(500); // Reduced from 1000ms
    
    await page.waitForSelector(".sort-CaseNumber", { visible: true });
    console.log("Case results loaded");
    emit(uid, 'success', 'Notes fetched successfully!');
    
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

    // Check for existing note first using the search filter
    const noteExists = await checkForExistingNote(page);
    
    if (!noteExists) {
      // If no existing note found, try the table search method as fallback
      const foundInTable = await findAndClickEdit(page, formattedDate, targetServiceTime);
      
      if (foundInTable) {
        console.log(`Found existing note in table for Date: "${formattedDate}" and Time: "${targetServiceTime}".`);
        emit(uid, 'progress', 'Found existing note in table!');
      } else {
        console.log(`No existing note found. Proceeding to create a new note.`);
        emit(uid, 'progress', 'Creating a new note!');
        await sleep(200);
        emit(uid, 'progress', 'Creating Note!');

        // Create new note
        const addButtonSelector = ".mb-3.me-1.btn.btn-sm.btn-subtle-secondary.btn-floating";
        await page.waitForSelector(addButtonSelector, { visible: true, timeout: defaultTimeout });
        await page.click(addButtonSelector);
        console.log("Clicked on Add Note button to create a new case note");

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
    } else {
      emit(uid, 'progress', 'Found existing note! Proceeding to edit...');
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

    emit(uid, 'success', 'Observations completed!');
    console.log("ready to save the note");
    await saveAndReadyNote();

    if (mileageStartAddress && mileageStartAddress.trim() !== '') {
      
      const mileageTabSelector = 'a[href*="/dfcs/notes/trips"]';
      await page.waitForSelector(mileageTabSelector, { visible: true, timeout: defaultTimeout });
      await page.click(mileageTabSelector);
      console.log('Clicked on the "Mileage" tab');

      await processMileageTable(page);

      const mileageStartAddressSelector = "#DataModels_0__StartAddress";
      const mileageStartMileageSelector = "#DataModels_0__StartMileage";
      await populateStartDetails(page, mileageStartAddress, mileageStartMileage || '', mileageStartAddressSelector, mileageStartMileageSelector);
      
      console.log("entering end addresses");
      await sleep(300); // Reduced from 1000ms
      await populateMileageEntries(page, endAddresses, additionalDropdownValues);
      await saveAndReadyNote();
      
      await page.waitForSelector("#ctl00_UpdateProgressDisplay", { hidden: true, timeout: defaultTimeout });
      console.log("Mileage Successfully Saved!");
      emit(uid, 'success', 'Mileage Saved Successfully!');
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
