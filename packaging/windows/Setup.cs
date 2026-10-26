using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;
using System.Drawing;
using System.Diagnostics;
using Microsoft.Win32;

namespace StreamAppInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private ProgressBar progressBar;
        private Label statusLabel;
        private Timer timer;

        public InstallerForm()
        {
            this.Text = "ShadowStream Setup";
            this.Size = new Size(480, 200);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(16, 16, 20);
            this.ForeColor = Color.White;

            Label titleLabel = new Label()
            {
                Text = "Installing ShadowStream — Cinematic Discovery",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                Location = new Point(24, 20),
                AutoSize = true,
                ForeColor = Color.FromArgb(229, 9, 20)
            };
            this.Controls.Add(titleLabel);

            statusLabel = new Label()
            {
                Text = "Extracting desktop application files...",
                Font = new Font("Segoe UI", 9),
                Location = new Point(24, 55),
                Size = new Size(420, 20),
                ForeColor = Color.LightGray
            };
            this.Controls.Add(statusLabel);

            progressBar = new ProgressBar()
            {
                Location = new Point(24, 85),
                Size = new Size(420, 24),
                Style = ProgressBarStyle.Marquee
            };
            this.Controls.Add(progressBar);

            timer = new Timer();
            timer.Interval = 100;
            timer.Tick += (s, e) => {
                timer.Stop();
                DoInstall();
            };
            timer.Start();
        }

        private void DoInstall()
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installDir = Path.Combine(localAppData, @"Programs\ShadowStream");

                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                // Extract embedded zip
                Assembly assembly = Assembly.GetExecutingAssembly();
                using (Stream stream = assembly.GetManifestResourceStream("StreamApp.app.zip"))
                {
                    if (stream != null)
                    {
                        using (ZipArchive archive = new ZipArchive(stream))
                        {
                            foreach (ZipArchiveEntry entry in archive.Entries)
                            {
                                string destPath = Path.Combine(installDir, entry.FullName);
                                if (string.IsNullOrEmpty(entry.Name))
                                {
                                    Directory.CreateDirectory(destPath);
                                }
                                else
                                {
                                    string dir = Path.GetDirectoryName(destPath);
                                    if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                                    entry.ExtractToFile(destPath, true);
                                }
                            }
                        }
                    }
                }

                string exePath = Path.Combine(installDir, "ShadowStream.exe");
                if (!File.Exists(exePath))
                {
                    exePath = Path.Combine(installDir, "StreamApp.exe");
                }

                // Create Desktop Shortcut
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                CreateShortcut(Path.Combine(desktop, "ShadowStream.lnk"), exePath, "ShadowStream — Cinematic Discovery");

                // Create Start Menu Shortcut
                string startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                CreateShortcut(Path.Combine(startMenu, "ShadowStream.lnk"), exePath, "ShadowStream — Cinematic Discovery");

                // Register in Windows Add/Remove Programs
                RegisterUninstall(installDir, exePath);

                // Launch ShadowStream in its standalone window
                if (File.Exists(exePath))
                {
                    Process.Start(new ProcessStartInfo(exePath) { UseShellExecute = true });
                }

                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Installation encountered an issue: " + ex.Message, "ShadowStream Setup", MessageBoxButtons.OK, MessageBoxIcon.Information);
                this.Close();
            }
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetPath;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                    shortcut.Description = description;
                    shortcut.Save();
                }
            }
            catch { }
        }

        private void RegisterUninstall(string installDir, string exePath)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\ShadowStream"))
                {
                    if (key != null)
                    {
                        key.SetValue("DisplayName", "ShadowStream — Cinematic Discovery");
                        key.SetValue("DisplayIcon", exePath + ",0");
                        key.SetValue("DisplayVersion", "2.4.26");
                        key.SetValue("Publisher", "ShadowStream");
                        key.SetValue("InstallLocation", installDir);
                        key.SetValue("UninstallString", "cmd.exe /c rd /s /q \"" + installDir + "\" & del \"%USERPROFILE%\\Desktop\\ShadowStream.lnk\" & del \"%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\ShadowStream.lnk\"");
                        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
        }
    }
}
