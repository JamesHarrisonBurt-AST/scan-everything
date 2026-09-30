#!/usr/bin/env python3
"""Regenerate ScanAnythingAI.xcodeproj from the files on disk.

Run from anywhere:
  python3 ios/ScanAnythingAI/scripts/generate_xcodeproj.py
"""

from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "ScanAnythingAI"
PROJECT = ROOT / "ScanAnythingAI.xcodeproj"
TARGET_NAME = "ScanAnythingAI"


def uid(key: str) -> str:
    return hashlib.sha1(key.encode()).hexdigest()[:24].upper()


def quote(value: str) -> str:
    if value.isalnum() or value in {".", ".."}:
        return value
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def main() -> None:
    swift_files = sorted(APP.rglob("*.swift"))
    resources = [
        APP / "Assets.xcassets",
        APP / "PrivacyInfo.xcprivacy",
    ]
    info_plist = APP / "Info.plist"
    for path in resources + [info_plist]:
        if not path.exists():
            raise SystemExit(f"Missing {path}")

    file_refs: dict[Path, str] = {}
    build_files: list[tuple[str, Path, str]] = []

    def ref_for(path: Path) -> str:
        if path not in file_refs:
            file_refs[path] = uid(f"ref:{path.relative_to(ROOT)}")
        return file_refs[path]

    source_builds = []
    for path in swift_files:
        ref = ref_for(path)
        build_id = uid(f"build:{path.relative_to(ROOT)}")
        source_builds.append((build_id, ref, path.name))
        build_files.append((build_id, path, "source"))

    resource_builds = []
    for path in resources:
        ref = ref_for(path)
        build_id = uid(f"build:{path.relative_to(ROOT)}")
        resource_builds.append((build_id, ref, path.name))

    info_ref = ref_for(info_plist)
    product_ref = uid("product:app")
    package_ref = uid("package:ScanAnythingCore")
    package_dep = uid("dep:ScanAnythingCore")
    framework_build = uid("build:ScanAnythingCore")

    sources_phase = uid("phase:sources")
    frameworks_phase = uid("phase:frameworks")
    resources_phase = uid("phase:resources")
    target_id = uid("target:app")
    project_id = uid("project")
    main_group = uid("group:main")
    app_group = uid("group:app")
    products_group = uid("group:products")
    project_config_list = uid("configlist:project")
    target_config_list = uid("configlist:target")
    project_debug = uid("config:project:debug")
    project_release = uid("config:project:release")
    target_debug = uid("config:target:debug")
    target_release = uid("config:target:release")

    # Groups mirror directories under the app folder, plus the project root.
    dirs = sorted({path.parent for path in list(file_refs) if path.is_file() or path.suffix == ".xcassets"})
    # Assets is a directory file reference, not a group of children.
    group_ids: dict[Path, str] = {APP: app_group}
    for directory in dirs:
        if directory == APP or not directory.is_relative_to(APP):
            continue
        group_ids[directory] = uid(f"group:{directory.relative_to(ROOT)}")

    def children_of(directory: Path) -> list[str]:
        lines = []
        subdirs = sorted((path for path in group_ids if path.parent == directory), key=lambda item: item.name)
        for sub in subdirs:
            lines.append(f"\t\t\t\t{group_ids[sub]} /* {sub.name} */,")
        files = sorted((path for path in file_refs if path.parent == directory), key=lambda item: item.name)
        for path in files:
            lines.append(f"\t\t\t\t{file_refs[path]} /* {path.name} */,")
        return lines

    objects: list[str] = []

    objects.append("/* Begin PBXBuildFile section */")
    for build_id, ref, name in source_builds:
        objects.append(f"\t\t{build_id} /* {name} in Sources */ = {{isa = PBXBuildFile; fileRef = {ref} /* {name} */; }};")
    for build_id, ref, name in resource_builds:
        objects.append(f"\t\t{build_id} /* {name} in Resources */ = {{isa = PBXBuildFile; fileRef = {ref} /* {name} */; }};")
    objects.append(f"\t\t{framework_build} /* ScanAnythingCore in Frameworks */ = {{isa = PBXBuildFile; productRef = {package_dep} /* ScanAnythingCore */; }};")
    objects.append("/* End PBXBuildFile section */")
    objects.append("")

    objects.append("/* Begin PBXFileReference section */")
    for path, ref in sorted(file_refs.items(), key=lambda item: str(item[0])):
        name = path.name
        rel = path.relative_to(ROOT).as_posix()
        if path.suffix == ".swift":
            kind = "sourcecode.swift"
        elif path.suffix == ".plist":
            kind = "text.plist.xml"
        elif path.suffix == ".xcprivacy":
            kind = "text.plist.xml"
        elif path.suffix == ".xcassets":
            kind = "folder.assetcatalog"
        else:
            kind = "text"
        objects.append(
            f"\t\t{ref} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = {kind}; path = {quote(name)}; sourceTree = \"<group>\"; }};"
        )
    objects.append(
        f"\t\t{product_ref} /* ScanAnythingAI.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ScanAnythingAI.app; sourceTree = BUILT_PRODUCTS_DIR; }};"
    )
    objects.append("/* End PBXFileReference section */")
    objects.append("")

    objects.append("/* Begin PBXFrameworksBuildPhase section */")
    objects.append(f"\t\t{frameworks_phase} /* Frameworks */ = {{")
    objects.append("\t\t\tisa = PBXFrameworksBuildPhase;")
    objects.append("\t\t\tbuildActionMask = 2147483647;")
    objects.append("\t\t\tfiles = (")
    objects.append(f"\t\t\t\t{framework_build} /* ScanAnythingCore in Frameworks */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    objects.append("\t\t};")
    objects.append("/* End PBXFrameworksBuildPhase section */")
    objects.append("")

    objects.append("/* Begin PBXGroup section */")
    for directory, group_id in sorted(group_ids.items(), key=lambda item: str(item[0])):
        name = directory.name
        objects.append(f"\t\t{group_id} /* {name} */ = {{")
        objects.append("\t\t\tisa = PBXGroup;")
        objects.append("\t\t\tchildren = (")
        objects.extend(children_of(directory))
        objects.append("\t\t\t);")
        objects.append(f"\t\t\tpath = {quote(name)};")
        objects.append('\t\t\tsourceTree = "<group>";')
        objects.append("\t\t};")
    objects.append(f"\t\t{products_group} /* Products */ = {{")
    objects.append("\t\t\tisa = PBXGroup;")
    objects.append("\t\t\tchildren = (")
    objects.append(f"\t\t\t\t{product_ref} /* ScanAnythingAI.app */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tname = Products;")
    objects.append('\t\t\tsourceTree = "<group>";')
    objects.append("\t\t};")
    objects.append(f"\t\t{main_group} = {{")
    objects.append("\t\t\tisa = PBXGroup;")
    objects.append("\t\t\tchildren = (")
    objects.append(f"\t\t\t\t{app_group} /* ScanAnythingAI */,")
    objects.append(f"\t\t\t\t{products_group} /* Products */,")
    objects.append("\t\t\t);")
    objects.append('\t\t\tsourceTree = "<group>";')
    objects.append("\t\t};")
    objects.append("/* End PBXGroup section */")
    objects.append("")

    objects.append("/* Begin PBXNativeTarget section */")
    objects.append(f"\t\t{target_id} /* ScanAnythingAI */ = {{")
    objects.append("\t\t\tisa = PBXNativeTarget;")
    objects.append(f"\t\t\tbuildConfigurationList = {target_config_list} /* Build configuration list for PBXNativeTarget \"ScanAnythingAI\" */;")
    objects.append("\t\t\tbuildPhases = (")
    objects.append(f"\t\t\t\t{sources_phase} /* Sources */,")
    objects.append(f"\t\t\t\t{frameworks_phase} /* Frameworks */,")
    objects.append(f"\t\t\t\t{resources_phase} /* Resources */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tbuildRules = (")
    objects.append("\t\t\t);")
    objects.append("\t\t\tdependencies = (")
    objects.append("\t\t\t);")
    objects.append("\t\t\tname = ScanAnythingAI;")
    objects.append("\t\t\tpackageProductDependencies = (")
    objects.append(f"\t\t\t\t{package_dep} /* ScanAnythingCore */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tproductName = ScanAnythingAI;")
    objects.append(f"\t\t\tproductReference = {product_ref} /* ScanAnythingAI.app */;")
    objects.append('\t\t\tproductType = "com.apple.product-type.application";')
    objects.append("\t\t};")
    objects.append("/* End PBXNativeTarget section */")
    objects.append("")

    objects.append("/* Begin PBXProject section */")
    objects.append(f"\t\t{project_id} /* Project object */ = {{")
    objects.append("\t\t\tisa = PBXProject;")
    objects.append("\t\t\tattributes = {")
    objects.append("\t\t\t\tBuildIndependentTargetsInParallel = 1;")
    objects.append("\t\t\t\tLastSwiftUpdateCheck = 1600;")
    objects.append("\t\t\t\tLastUpgradeCheck = 1600;")
    objects.append("\t\t\t\tTargetAttributes = {")
    objects.append(f"\t\t\t\t\t{target_id} = {{")
    objects.append("\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;")
    objects.append("\t\t\t\t\t};")
    objects.append("\t\t\t\t};")
    objects.append("\t\t\t};")
    objects.append(f"\t\t\tbuildConfigurationList = {project_config_list} /* Build configuration list for PBXProject \"ScanAnythingAI\" */;")
    objects.append('\t\t\tcompatibilityVersion = "Xcode 14.0";')
    objects.append("\t\t\tdevelopmentRegion = en;")
    objects.append("\t\t\thasScannedForEncodings = 0;")
    objects.append("\t\t\tknownRegions = (")
    objects.append("\t\t\t\ten,")
    objects.append("\t\t\t\tBase,")
    objects.append("\t\t\t);")
    objects.append(f"\t\t\tmainGroup = {main_group};")
    objects.append("\t\t\tpackageReferences = (")
    objects.append(f"\t\t\t\t{package_ref} /* XCLocalSwiftPackageReference \"ScanAnythingCore\" */,")
    objects.append("\t\t\t);")
    objects.append(f"\t\t\tproductRefGroup = {products_group} /* Products */;")
    objects.append('\t\t\tprojectDirPath = "";')
    objects.append('\t\t\tprojectRoot = "";')
    objects.append("\t\t\ttargets = (")
    objects.append(f"\t\t\t\t{target_id} /* ScanAnythingAI */,")
    objects.append("\t\t\t);")
    objects.append("\t\t};")
    objects.append("/* End PBXProject section */")
    objects.append("")

    objects.append("/* Begin PBXResourcesBuildPhase section */")
    objects.append(f"\t\t{resources_phase} /* Resources */ = {{")
    objects.append("\t\t\tisa = PBXResourcesBuildPhase;")
    objects.append("\t\t\tbuildActionMask = 2147483647;")
    objects.append("\t\t\tfiles = (")
    for build_id, _, name in resource_builds:
        objects.append(f"\t\t\t\t{build_id} /* {name} in Resources */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    objects.append("\t\t};")
    objects.append("/* End PBXResourcesBuildPhase section */")
    objects.append("")

    objects.append("/* Begin PBXSourcesBuildPhase section */")
    objects.append(f"\t\t{sources_phase} /* Sources */ = {{")
    objects.append("\t\t\tisa = PBXSourcesBuildPhase;")
    objects.append("\t\t\tbuildActionMask = 2147483647;")
    objects.append("\t\t\tfiles = (")
    for build_id, _, name in source_builds:
        objects.append(f"\t\t\t\t{build_id} /* {name} in Sources */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    objects.append("\t\t};")
    objects.append("/* End PBXSourcesBuildPhase section */")
    objects.append("")

    shared_settings = """
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_C_LANGUAGE_STANDARD = gnu17;
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
				MTL_FAST_MATH = YES;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = 1;
"""
    release_shared = """
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_C_LANGUAGE_STANDARD = gnu17;
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				MTL_ENABLE_DEBUG_INFO = NO;
				MTL_FAST_MATH = YES;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = 1;
				VALIDATE_PRODUCT = YES;
"""
    target_base = """
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				ENABLE_PREVIEWS = YES;
				GENERATE_INFOPLIST_FILE = YES;
				INFOPLIST_FILE = ScanAnythingAI/Info.plist;
				INFOPLIST_KEY_CFBundleDisplayName = "Scan Anything AI";
				INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents = YES;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = ai.scananything.app;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SUPPORTED_PLATFORMS = "iphoneos iphonesimulator";
				SUPPORTS_MACCATALYST = NO;
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = 1;
"""

    objects.append("/* Begin XCBuildConfiguration section */")
    objects.append(f"\t\t{project_debug} /* Debug */ = {{")
    objects.append("\t\t\tisa = XCBuildConfiguration;")
    objects.append("\t\t\tbuildSettings = {")
    objects.append(shared_settings.rstrip())
    objects.append("\t\t\t\tONLY_ACTIVE_ARCH = YES;")
    objects.append("\t\t\t};")
    objects.append("\t\t\tname = Debug;")
    objects.append("\t\t};")
    objects.append(f"\t\t{project_release} /* Release */ = {{")
    objects.append("\t\t\tisa = XCBuildConfiguration;")
    objects.append("\t\t\tbuildSettings = {")
    objects.append(release_shared.rstrip())
    objects.append("\t\t\t};")
    objects.append("\t\t\tname = Release;")
    objects.append("\t\t};")
    objects.append(f"\t\t{target_debug} /* Debug */ = {{")
    objects.append("\t\t\tisa = XCBuildConfiguration;")
    objects.append("\t\t\tbuildSettings = {")
    objects.append(target_base.rstrip())
    objects.append("\t\t\t};")
    objects.append("\t\t\tname = Debug;")
    objects.append("\t\t};")
    objects.append(f"\t\t{target_release} /* Release */ = {{")
    objects.append("\t\t\tisa = XCBuildConfiguration;")
    objects.append("\t\t\tbuildSettings = {")
    objects.append(target_base.rstrip())
    objects.append("\t\t\t};")
    objects.append("\t\t\tname = Release;")
    objects.append("\t\t};")
    objects.append("/* End XCBuildConfiguration section */")
    objects.append("")

    objects.append("/* Begin XCConfigurationList section */")
    objects.append(f"\t\t{project_config_list} /* Build configuration list for PBXProject \"ScanAnythingAI\" */ = {{")
    objects.append("\t\t\tisa = XCConfigurationList;")
    objects.append("\t\t\tbuildConfigurations = (")
    objects.append(f"\t\t\t\t{project_debug} /* Debug */,")
    objects.append(f"\t\t\t\t{project_release} /* Release */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tdefaultConfigurationIsVisible = 0;")
    objects.append("\t\t\tdefaultConfigurationName = Release;")
    objects.append("\t\t};")
    objects.append(f"\t\t{target_config_list} /* Build configuration list for PBXNativeTarget \"ScanAnythingAI\" */ = {{")
    objects.append("\t\t\tisa = XCConfigurationList;")
    objects.append("\t\t\tbuildConfigurations = (")
    objects.append(f"\t\t\t\t{target_debug} /* Debug */,")
    objects.append(f"\t\t\t\t{target_release} /* Release */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tdefaultConfigurationIsVisible = 0;")
    objects.append("\t\t\tdefaultConfigurationName = Release;")
    objects.append("\t\t};")
    objects.append("/* End XCConfigurationList section */")
    objects.append("")

    objects.append("/* Begin XCLocalSwiftPackageReference section */")
    objects.append(f"\t\t{package_ref} /* XCLocalSwiftPackageReference \"ScanAnythingCore\" */ = {{")
    objects.append("\t\t\tisa = XCLocalSwiftPackageReference;")
    objects.append("\t\t\trelativePath = ScanAnythingCore;")
    objects.append("\t\t};")
    objects.append("/* End XCLocalSwiftPackageReference section */")
    objects.append("")

    objects.append("/* Begin XCSwiftPackageProductDependency section */")
    objects.append(f"\t\t{package_dep} /* ScanAnythingCore */ = {{")
    objects.append("\t\t\tisa = XCSwiftPackageProductDependency;")
    objects.append(f"\t\t\tpackage = {package_ref} /* XCLocalSwiftPackageReference \"ScanAnythingCore\" */;")
    objects.append("\t\t\tproductName = ScanAnythingCore;")
    objects.append("\t\t};")
    objects.append("/* End XCSwiftPackageProductDependency section */")

    pbx = "\n".join(
        [
            "// !$*UTF8*$!",
            "{",
            "\tarchiveVersion = 1;",
            "\tclasses = {",
            "\t};",
            "\tobjectVersion = 56;",
            "\tobjects = {",
            "",
            *objects,
            "\t};",
            f"\trootObject = {project_id} /* Project object */;",
            "}",
            "",
        ]
    )
    proj_dir = PROJECT
    proj_dir.mkdir(parents=True, exist_ok=True)
    (proj_dir / "project.pbxproj").write_text(pbx, encoding="utf-8")

    scheme_dir = proj_dir / "xcshareddata" / "xcschemes"
    scheme_dir.mkdir(parents=True, exist_ok=True)
    scheme = f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1600"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{target_id}"
               BuildableName = "ScanAnythingAI.app"
               BlueprintName = "ScanAnythingAI"
               ReferencedContainer = "container:ScanAnythingAI.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "ScanAnythingAI.app"
            BlueprintName = "ScanAnythingAI"
            ReferencedContainer = "container:ScanAnythingAI.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "ScanAnythingAI.app"
            BlueprintName = "ScanAnythingAI"
            ReferencedContainer = "container:ScanAnythingAI.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
"""
    (scheme_dir / "ScanAnythingAI.xcscheme").write_text(scheme, encoding="utf-8")
    print(f"Wrote {proj_dir / 'project.pbxproj'} with {len(swift_files)} Swift files")


if __name__ == "__main__":
    main()
