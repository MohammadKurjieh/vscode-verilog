"use strict";
import fs = require('fs');
import * as vscode from "vscode";
import { Configs } from "./configs";
import { AltPathCommands, AvailableCommands } from './consts';
import { basename, extname, dirname, join } from "path";

export class Commands implements vscode.Disposable {
  private LANGUAGE_NAME = "Verilog";

  private cwd: string;
  private config: Configs;
  private isRunning: boolean;
  private isSuccess: boolean;
  private isCompiling: boolean;
  private terminal: vscode.Terminal;
  private document: vscode.TextDocument;
  private outputChannel: vscode.OutputChannel;

  private compileProcess: any;
  private executeProcess: any;

  constructor(config: Configs) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel(this.LANGUAGE_NAME);
    this.terminal = vscode.window.createTerminal(this.LANGUAGE_NAME);
  }


  public async executeCommand(fileUri: vscode.Uri, command: AvailableCommands) {
    if (this.isRunning) {
      vscode.window.showInformationMessage("Already running!");
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (fileUri && editor && fileUri.fsPath !== editor.document.uri.fsPath) {
      this.document = await vscode.workspace.openTextDocument(fileUri);
    } else if (editor) {
      this.document = editor.document;
    } else {
      vscode.window.showInformationMessage("No supported file found or selected.");
      return;
    }

    this.cwd = dirname(this.document.fileName);
    const extName = extname(this.document.fileName);
    const fileName = basename(this.document.fileName, extName);

    if (command === AvailableCommands.runFile) {
      this.runFile(fileName, extName);
    } else if (AvailableCommands.compileAll) {
      this.compileAll(this.cwd)
    }
  }

  private runFile(fileName: string, extName: string): void {
    if (this.config.runInTerminal) {
      this.executeRunInTerminal(fileName, extName);
    } else {
      this.executeRunInOutputChannel(fileName, extName);
    }
  }

  private async compileAll(dir: string): Promise<void> {
    if (this.config.clearPreviousOutput) {
      if (this.config.runInTerminal) {
        vscode.commands.executeCommand("workbench.action.terminal.clear");
      } else {
        this.outputChannel.clear();
      }
    }
    this.outputChannel.appendLine(`[Compiling Started]`);
    this.outputChannel.appendLine("");
    const startTime = new Date();

    var files = fs.readdirSync(dir);
    files = files.filter(f => this.config.exts.indexOf(extname(f)) !== -1);

    for (const file of files) {
      const ext = extname(file);
      if (this.config.runInTerminal) {
        this.executeCompileInTerminal(file.replace(ext, ""), ext, false);
      } else {
        await this.executeCompileInOutputChannel(file.replace(ext, ""), ext, true);
      }
    }

    const endTime = new Date();
    const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
    this.outputChannel.appendLine(`[Done] Compiling Done in ${elapsedTime} seconds`);
    this.outputChannel.appendLine("");
  }

  private executeRunInTerminal(fileName: string, extName: string): void {
    this.executeCompileInTerminal(fileName, extName);
    this.terminal.sendText(`cd build`);
    this.terminal.sendText(this.runCommand(fileName));
  }

  private executeCompileInTerminal(fileName: string, extName: string, bulk: boolean = false): void {

    if (this.config.clearPreviousOutput && !bulk) vscode.commands.executeCommand("workbench.action.terminal.clear");

    this.terminal.show(this.config.preserveFocus);
    this.terminal.sendText(`cd "${this.cwd}"`);
    this.terminal.sendText(`mkdir build`);
    this.terminal.sendText(this.compileCommand(fileName, extName, bulk));
  }

  private async executeRunInOutputChannel(fileName: string, extName: string): Promise<void> {

    await this.executeCompileInOutputChannel(fileName, extName);

    this.isRunning = true;
    const exec = require("child_process").exec;
    const startTime = new Date();
    this.outputChannel.appendLine(`[Run] ${basename(fileName)}`);
    return new Promise<void>((res, _rej) => {

      this.executeProcess = exec(this.runCommand(fileName), { cwd: this.cwd + '/build' });

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
        res();
      });
    });
  }

  private async executeCompileInOutputChannel(fileName: string, extName: string, bulk: boolean = false): Promise<void> {
    return new Promise<void>((res, _rej) => {
      const indent = bulk ? "  " : "";

      if (this.config.clearPreviousOutput && !bulk) this.outputChannel.clear();

      this.isRunning = true;
      this.isCompiling = true;
      this.isSuccess = true;
      this.outputChannel.show(this.config.preserveFocus);
      this.outputChannel.appendLine(`${indent}[Compile] ${fileName}${extName}`);
      const exec = require("child_process").exec;
      const startTime = new Date();

      exec('mkdir build', { cwd: this.cwd });
      this.compileProcess = exec(this.compileCommand(fileName, extName, bulk), { cwd: this.cwd });

      this.compileProcess.stdout.on("data", (data: string) => {
        this.outputChannel.append(this.indent(`${data}`, bulk));
        if (data.match("I give up.")) this.isSuccess = false;
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

  private indent(string: string, bulk = false) {
    var split = string.slice(0, -1).split('\n');
    split = split.map(l => (bulk ? '    ' : '  ') + l);
    return split.join('\n');
  }

  private pathSelector(exec: string, ext: string, bulk: boolean) {
    if ((this.config.altPathCmd === AltPathCommands.All || (bulk && this.config.altPathCmd === AltPathCommands.BulkCompile) || (!bulk && this.config.altPathCmd === AltPathCommands.SingleCompile)) && this.config.altPath !== undefined) {
      if (this.config.altPath.endsWith(ext)) {
        return `"${this.config.altPath}"`;
      } else {
        return `"${join(this.config.altPath, `${exec}${ext}`)}"`;
      }
    } else {
      return exec;
    }
  }

  private compileCommand(fileName: string, extName: string, bulk: boolean): string {
    var COMPILE_COMMANDS = " -o \"build/{fileName}{outExt}\" \"{fileName}{ext}\" " + this.config.flags;
    COMPILE_COMMANDS = this.pathSelector('iverilog', '.exe', bulk) + COMPILE_COMMANDS;

    return COMPILE_COMMANDS.replace(/{fileName}/g, fileName).replace(/{ext}/g, extName).replace(/{outExt}/, this.config.outExt);
  }

  private runCommand(fileName: string): string {
    var RUN_COMMANDS = " \"{fileName}{outExt}\"";
    RUN_COMMANDS = this.pathSelector('vvp', '.exe', false) + RUN_COMMANDS;

    return RUN_COMMANDS.replace(/{fileName}/g, fileName).replace(/{outExt}/, this.config.outExt);
  }
}