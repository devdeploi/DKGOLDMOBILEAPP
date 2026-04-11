require 'xcodeproj'

project_path = '/Users/apple/JEWELAPP/AURUMMobileApp/ios/JewelMobileApp.xcodeproj'
file_name = 'GoogleService-Info.plist'
group_name = 'JewelMobileApp'

project = Xcodeproj::Project.open(project_path)

# Find the target
target = project.targets.find { |t| t.name == 'JewelMobileApp' }
if target.nil?
  puts "Target 'JewelMobileApp' not found."
  exit 1
end

# Find the group
group = project.main_group.children.find { |c| c.isa == 'PBXGroup' && (c.name == group_name || c.path == group_name) }
if group.nil?
  puts "Group '#{group_name}' not found. Creating it..."
  group = project.main_group.new_group(group_name)
end

# Get or create file reference
file_ref = group.find_file_by_path(file_name)
if file_ref
  puts "File reference for #{file_name} already exists."
else
  file_ref = group.new_reference(file_name)
  puts "Created file reference for #{file_name}."
end

# Add to Resources build phase
resources_phase = target.resources_build_phase
build_file = resources_phase.files.find { |f| f.file_ref == file_ref }

if build_file
  puts "#{file_name} is already in the Resources build phase."
else
  resources_phase.add_file_reference(file_ref)
  puts "Added #{file_name} to the Resources build phase."
  project.save
  puts "Project saved."
end
