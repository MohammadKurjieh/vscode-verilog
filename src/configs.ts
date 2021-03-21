"use strict";
import * as vscode from "vscode";
import { AltPathCommands } from "./consts";

export class Configs implements vscode.Disposable {

  public openVCD: boolean = false;
  public exts: Array<String> = [];
  public runInTerminal: boolean = false;
  public preserveFocus: boolean = true;
  public clearPreviousOutput: boolean = true;
  public altPath: string = '';
  public altPathCmd: AltPathCommands = AltPathCommands.None;
  public outExt: string = '.out';
  public flags: string = '';


  private EXTENTSION_NAME = "verilogrunner";
  private config: vscode.WorkspaceConfiguration;


  public updateConfig() {
    this.config = vscode.workspace.getConfiguration(this.EXTENTSION_NAME);
    this.runInTerminal = this.config.get<boolean>("Verilog.runInTerminal");
    this.clearPreviousOutput = this.config.get<boolean>("Verilog.clearPreviousOutput");
    this.preserveFocus = this.config.get<boolean>("Verilog.preserveFocus");
    this.openVCD = this.config.get<boolean>("Verilog.openVCD");
    this.altPath = this.config.get<string>("Verilog.alternativePathForIverilog");
    this.outExt = this.config.get<string>("Verilog.Output's Extension");
    this.flags = this.config.get<string>("Verilog.Custom Flags");

    this.altPathCmd = this.altPathCommands(this.config.get("Verilog.commandsToUseAlternativePath"));

    this.exts = vscode.workspace.getConfiguration(this.EXTENTSION_NAME).get<Array<String>>("Verilog.Supported Extensions");
    vscode.commands.executeCommand('setContext', 'verilogrunner.Verilog.Supported', this.exts);
  }

  private altPathCommands(choice: string) {
    switch (choice) {
      case 'None':
        return AltPathCommands.None;
      case 'Single Compile':
        return AltPathCommands.SingleCompile;
      case 'Bulk Compile':
        return AltPathCommands.BulkCompile;
      case 'All':
        return AltPathCommands.All;
      default:
        return AltPathCommands.None;
    }
  }


  dispose() { }

}