DEVORCH INSTALLATION
====================

QUICK START (macOS)
-------------------
1. Open Terminal (search "Terminal" in Spotlight)
2. Drag "setup.sh" into the Terminal window
3. Press Enter

QUICK START (Linux)
-------------------
1. Open a terminal in this folder
2. Run: ./setup.sh


WHAT GETS INSTALLED
-------------------
- The devorch binary is copied to ~/.local/bin/
- Your PATH is updated (you may need to restart your terminal)


AFTER INSTALLATION
------------------
Run this command to complete setup:

    devorch setup-bedrock


TROUBLESHOOTING (macOS)
-----------------------
If you get a "malware" or "cannot be opened" warning:

    cd ~/Downloads/devorch-mac-*
    xattr -d com.apple.quarantine setup.sh bin/devorch
    ./setup.sh


NEED HELP?
----------
Visit: https://github.com/guicheffer/devorch
