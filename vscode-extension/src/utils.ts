// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

"use strict";

import fs = require("fs");
import os = require("os");
import path = require("path");

async function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
  }

  
export function ensurePathExists(targetPath: string) {
  // Ensure that the path exists
  try {
      fs.mkdirSync(targetPath);
  } catch (e) {
      // If the exception isn't to indicate that the folder exists already, rethrow it.
      if (e.code !== "EEXIST") {
          throw e;
      }
  }
}