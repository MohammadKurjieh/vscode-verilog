"use strict";
import { basename, dirname } from "path";
import * as vscode from "vscode";
import { AvailableCommands } from './consts';
import fs = require('fs');

export class Commands implements vscode.Disposable {
  private LANGUAGE_NAME = "Verilog";
  private EXTENTSION_NAME = "verilogrunner";
  private COMPILE_COMMANDS = "iverilog -o build/{fileName}.out {fileName}";
  private RUN_COMMANDS = "vvp {fileName}.out";

  private outputChannel: vscode.OutputChannel;
  private terminal: vscode.Terminal;
  private config: vscode.WorkspaceConfiguration;
  private document: vscode.TextDocument;
  private cwd: string;
  private isRunning: boolean;
  private isCompiling: boolean;
  private isSuccess: boolean;
  private compileProcess;
  private executeProcess;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel(this.LANGUAGE_NAME);
    this.terminal = vscode.window.createTerminal(this.LANGUAGE_NAME);
  }

  public async executeCommand(fileUri: vscode.Uri, command: AvailableCommands) {
    if (this.isRunning) {
      vscode.window.showInformationMessage("Code is already running!");
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (fileUri && editor && fileUri.fsPath !== editor.document.uri.fsPath) {
      this.document = await vscode.workspace.openTextDocument(fileUri);
    } else if (editor) {
      this.document = editor.document;
    } else {
      vscode.window.showInformationMessage("No code found or selected.");
      return;
    }

    const fileName = basename(this.document.fileName);
    this.cwd = dirname(this.document.fileName);
    this.config = vscode.workspace.getConfiguration(this.EXTENTSION_NAME);
    const runInTerminal = this.config.get<boolean>("runInTerminal");
    const clearPreviousOutput = this.config.get<boolean>("clearPreviousOutput");
    const preserveFocus = this.config.get<boolean>("preserveFocus");
    const openVCD = this.config.get<boolean>("openVCD");

    if (command === AvailableCommands.runFile) {
      this.runFile(runInTerminal, fileName, clearPreviousOutput, preserveFocus, openVCD);
    } else if (AvailableCommands.compileAll) {
      this.compileAll(runInTerminal, this.cwd, clearPreviousOutput, preserveFocus)
    }
  }

  public runFile(runInTerminal: boolean, fileName: string, clearPreviousOutput: boolean, preserveFocus: boolean, openVCD: boolean): void {
    if (runInTerminal) {
      this.executeRunInTerminal(fileName, clearPreviousOutput, preserveFocus);
    } else {
      this.executeRunInOutputChannel(fileName, clearPreviousOutput, preserveFocus, openVCD);
    }
  }

  public async compileAll(runInTerminal: boolean, directory: string, clearPreviousOutput: boolean, preserveFocus: boolean): Promise<void> {
    if (clearPreviousOutput) {
      if (runInTerminal) {
        vscode.commands.executeCommand("workbench.action.terminal.clear");
      } else {
        this.outputChannel.clear();
      }
    }
    this.outputChannel.appendLine(`[Compiling Started]`);
    this.outputChannel.appendLine("");
    const startTime = new Date();

    for (const file of fs.readdirSync(directory)) {
      if (file.match(/^(.*)+(.v|.vh|.sv)$/)) {
        if (runInTerminal) {
          this.executeCompileInTerminal(file, false, preserveFocus);
        } else {
          await this.executeCompileInOutputChannel(file, false, preserveFocus, true);
        }
      }
    };
    const endTime = new Date();
    const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
    this.outputChannel.appendLine(`[Done] Compiling Done in ${elapsedTime} seconds`);
    this.outputChannel.appendLine("");
  }

  public executeRunInTerminal(fileName: string, clearPreviousOutput: boolean, preserveFocus: boolean): void {
    this.executeCompileInTerminal(fileName, clearPreviousOutput, preserveFocus);
    this.terminal.sendText(`cd build`);
    this.terminal.sendText(this.RUN_COMMANDS.replace(/{fileName}/g, fileName));
  }

  public executeCompileInTerminal(fileName: string, clearPreviousOutput: boolean, preserveFocus: boolean): void {
    if (clearPreviousOutput) {
      vscode.commands.executeCommand("workbench.action.terminal.clear");
    }
    this.terminal.show(preserveFocus);
    this.terminal.sendText(`cd "${this.cwd}"`);
    this.terminal.sendText(`mkdir build`);
    this.terminal.sendText(this.COMPILE_COMMANDS.replace(/{fileName}/g, fileName));
  }

  public async executeRunInOutputChannel(fileName: string, clearPreviousOutput: boolean, preserveFocus: boolean, openVCD: boolean): Promise<void> {
    
    await this.executeCompileInOutputChannel(fileName, clearPreviousOutput, preserveFocus);

    this.isRunning = true;
    const exec = require("child_process").exec;
    const startTime = new Date();
    this.outputChannel.appendLine(`[Run] ${basename(fileName)}`);
    return new Promise<void>((res, _rej) => {
      
      this.executeProcess = exec(this.RUN_COMMANDS.replace(/{fileName}/g, fileName), { cwd: this.cwd + '/build' });

      this.executeProcess.stdout.on("data", (data: string) => {
        this.outputChannel.append(this.indent(`${data}`));
      });

      this.executeProcess.stderr.on("data", (data: string) => {
        this.outputChannel.append(this.indent(`${data}`));
      });

      this.executeProcess.on("close", (executeCode: string) => {
        this.isRunning = false;
        const endTime = new Date();
        const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
        this.outputChannel.appendLine(`[Done] exit with code=${executeCode} in ${elapsedTime} seconds`);
        this.outputChannel.appendLine("");
        // if (openVCD) {
        //   vscode.workspace.openTextDocument(this.cwd + `\\build\\${fileName.replace(/\.[^/.]+$/, "")}.vcd`).then(doc => {
        //     vscode.window.showTextDocument(doc);
        //   });
        // }
        res();
      });
    });
  }

  public async executeCompileInOutputChannel(fileName: string, clearPreviousOutput: boolean, preserveFocus: boolean, bulk = false): Promise<void> {
    return new Promise<void>((res, _rej) => {
      const indent = bulk ? "  " : "";
      if (clearPreviousOutput) {
        this.outputChannel.clear();
      }
      this.isRunning = true;
      this.isCompiling = true;
      this.isSuccess = true;
      this.outputChannel.show(preserveFocus);
      this.outputChannel.appendLine(`${indent}[Compile] ${basename(fileName)}`);
      const exec = require("child_process").exec;
      const startTime = new Date();

      exec('mkdir build', { cwd: this.cwd });
      this.compileProcess = exec(this.COMPILE_COMMANDS.replace(/{fileName}/g, fileName), { cwd: this.cwd });

      this.compileProcess.stdout.on("data", (data: string) => {
        this.outputChannel.append(this.indent(`${data}`, bulk));
        if (data.match("I give up.")) {
          this.isSuccess = false;
        }
      });

      this.compileProcess.stderr.on("data", (data: string) => {
        this.outputChannel.append(this.indent(`${data}`, bulk));
        this.isSuccess = false;
      });

      this.compileProcess.on("close", (compileCode: string) => {
        this.isCompiling = false;
        this.isRunning = false;
        const endTime = new Date();
        const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
        if (this.isSuccess) {
          this.outputChannel.appendLine(`${indent}[Done] exit with code=${compileCode} in ${elapsedTime} seconds`);
          this.outputChannel.appendLine("");
          res();
        } else {
          this.outputChannel.appendLine(`${indent}[Error] exit with code=${compileCode} in ${elapsedTime} seconds`);
          this.outputChannel.appendLine("");
          res();
        }
      });
    });
  }

  public stopCommand() {
    if (this.isRunning) {
      this.isRunning = false;
      const kill = require("tree-kill");
      if (this.isCompiling) {
        this.isCompiling = false;
        kill(this.compileProcess.pid);
      } else {
        kill(this.executeProcess.pid);
      }
    }
  }

  public dispose() {
    this.stopCommand();
  }

  public indent(string: string, bulk = false) {
    var split = string.slice(0, -1).split('\n');
    split = split.map(l => (bulk ? '    ' : '  ') + l);
    return split.join('\n');
  }
}
