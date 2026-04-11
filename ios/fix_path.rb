require 'xcodeproj'
project_path = '/Users/apple/JEWELAPP/AURUMMobileApp/ios/JewelMobileApp.xcodeproj'
project = Xcodeproj::Project.open(project_path)

file_ref = project.files.find { |f| f.path =~ /GoogleService-Info.plist/ }

if file_ref
  puts "Found file ref with path: #{file_ref.path}"
  # The real_path method resolves the absolute path based on source_tree
  full_path = file_ref.real_path
  puts "Resolved full path: #{full_path}"
  
  if File.exist?(full_path)
    puts "File exists at resolved path."
  else
    puts "File MISSING at resolved path."
    # The file is known to be at ios/JewelMobileApp/GoogleService-Info.plist
    # The project is at ios/JewelMobileApp.xcodeproj
    # So relative path is 'JewelMobileApp/GoogleService-Info.plist' (if group doesn't add prefix)
    # Or just use the correct relative path.
    
    new_path = 'JewelMobileApp/GoogleService-Info.plist'
    file_ref.path = new_path
    puts "Updated file reference path to: #{new_path}"
    project.save
    puts "Project saved."
  end
else
  puts "File reference not found in project."
end
