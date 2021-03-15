"use strict";
import * as vscode from "vscode";
import { Commands } from "./commands";
import { AvailableCommands } from './consts';

const commands = new Commands();

export function activate(context: vscode.ExtensionContext) {

  const run = vscode.commands.registerCommand("verilogrunner.run", (fileUri: vscode.Uri) => {
    commands.executeCommand(fileUri, AvailableCommands.runFile);
  });

  const compileAll = vscode.commands.registerCommand("verilogrunner.compileAll", (fileUri: vscode.Uri) => {
    commands.executeCommand(fileUri, AvailableCommands.compileAll);
  });

  const stop = vscode.commands.registerCommand("verilogrunner.stop", () => {
    commands.stopCommand();
  });

  context.subscriptions.push(run);
  context.subscriptions.push(compileAll);
  context.subscriptions.push(commands);
}

export function deactivate() {
  commands.stopCommand();
}
