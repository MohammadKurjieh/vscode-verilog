"use strict";
import * as vscode from "vscode";
import { Commands } from "./commands";
import { Configs } from "./configs";
import { AvailableCommands } from './consts';

const configs = new Configs();
const commands = new Commands(configs);

export function activate(context: vscode.ExtensionContext) {
  configs.updateConfig();

  const run = vscode.commands.registerCommand("verilogrunner.run", (fileUri: vscode.Uri) => {
    commands.executeCommand(fileUri, AvailableCommands.runFile);
  });

  const compileAll = vscode.commands.registerCommand("verilogrunner.compileAll", (fileUri: vscode.Uri) => {
    commands.executeCommand(fileUri, AvailableCommands.compileAll);
  });

  const stop = vscode.commands.registerCommand("verilogrunner.stop", () => {
    commands.stopCommand();
  });

  const configChange = vscode.workspace.onDidChangeConfiguration(_event => {
    configs.updateConfig();
  });

  context.subscriptions.concat([configChange, run, compileAll]);
}

export function deactivate() {
  commands.stopCommand();
}
