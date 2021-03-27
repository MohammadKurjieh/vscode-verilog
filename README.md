# A Fork Of This [Extension](https://github.com/leafvmaple/vscode-verilog)

## Major new Features:
* Compile all verilog files in a directory
* Output moved to ./build
* Dynamic File Extensions (Input and Output)
* Custom Compiling Flags
* Ability to change the directory of iverilog


<br />
<br />

# Verilog Language README

The Visual Studio Code extenstion for Verilog HDL Language support.

## Installation

Install it from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MohammadKurjieh.verilogrunner)

## Run Code

* **Install [Icarus Verilog](https://iverilog.fandom.com/wiki/Installation_Guide)**

  In Windows, you should add executable folder to the uesr PATH

* **Click the `Run Code` Button**

## Commands

* **Run Verilog HDL Code**

    Use Icarus Verilog to run the current code.

* **Compile all Verilog HDL Files in a directory**

    Use Icarus Verilog to all the files in the directory.

* **Stop Running**

    Stop Running Code.

## Release Notes

### Version 0.1.0
* Added Dynamic Input File Extension Support
* Added Dynamic Output Extension Support
* Added Alternate IVerilog Path
* Added Dynamic Path Choosing For Every Command
* Stop Command Can Now Stop The Terminal
* Added The Ability To Have Spaces Inside The File Names
* The Terminal Reopens When Running After Closing It
* Increased Version Number

### Version 0.0.7

* Added Compile All.
* Generated files are moved to ./build
* Minor ts types improvements

### Version 0.0.6

* Remove redundant code.

### Version 0.0.5

* Fixed the Bug when Running Code in Windows.

### Version 0.0.4

* Add Verilog Snippets.

### Version 0.0.3

* Change the compile filename.

### Version 0.0.2

* Fixed the Description.

### Version 0.0.1

* Create the `tmLanguage`.
