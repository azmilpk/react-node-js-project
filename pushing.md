# 1. See what changed
git status

# 2. Stage everything
git add .

# 3. Commit with a message
git commit -m "Add API_BASE_URL config, combined UL Pure history, fixes"

# 4. Push to both remotes
git push origin main
git push newrepo main


origin → hyperautodtfp-bot02_volvo/tti-env-report
newrepo → VolvoGroup-Internal/TTI_Ecosphere

# To push both with one command
git remote set-url --add --push origin https://github.com/hyperautodtfp-bot02_volvo/tti-env-report.git
git remote set-url --add --push origin https://github.com/VolvoGroup-Internal/TTI_Ecosphere.git