' Havells Enviro Pro Solar Monitor — Silent Background Launcher
' Starts python main.py silently without keeping a Command Prompt window open on desktop.
Dim WshShell, FSO, scriptDir
Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
scriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir
' Window style 0 = hidden, waitOnReturn = False
WshShell.Run "python main.py", 0, False
