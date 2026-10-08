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
SHARED = ROOT / "Shared"
WIDGET = ROOT / "ScanAnythingWidget"
PROJECT = ROOT / "ScanAnythingAI.xcodeproj"


def uid(key: str) -> str:
    return hashlib.sha1(key.encode()).hexdigest()[:24].upper()


def quote(value: str) -> str:
    if value.isalnum() or value in {".", ".."}:
        return value
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def file_kind(path: Path) -> str:
    if path.suffix == ".swift":
        return "sourcecode.swift"
    if path.suffix == ".plist":
        return "text.plist.xml"
    if path.suffix == ".xcprivacy":
        return "text.plist.xml"
    if path.suffix == ".xcassets":
        return "folder.assetcatalog"
    if path.suffix == ".entitlements":
        return "text.plist.entitlements"
    return "text"


def main() -> None:
    app_swift = sorted(APP.rglob("*.swift"))
    shared_swift = sorted(SHARED.rglob("*.swift"))
    widget_swift = sorted(WIDGET.rglob("*.swift"))
    app_resources = [APP / "Assets.xcassets", APP / "PrivacyInfo.xcprivacy"]
    app_side = [APP / "Info.plist", APP / "ScanAnythingAI.entitlements"]
    widget_side = [WIDGET / "Info.plist", WIDGET / "ScanAnythingWidget.entitlements"]
    for path in app_resources + app_side + widget_side + app_swift + shared_swift + widget_swift:
        if not path.exists():
            raise SystemExit(f"Missing {path}")

    file_refs: dict[Path, str] = {}

    def ref_for(path: Path) -> str:
        if path not in file_refs:
            file_refs[path] = uid(f"ref:{path.relative_to(ROOT)}")
        return file_refs[path]

    for path in app_swift + shared_swift + widget_swift + app_resources + app_side + widget_side:
        ref_for(path)

    def builds(paths: list[Path], scope: str) -> list[tuple[str, str, str]]:
        rows = []
        for path in paths:
            rows.append((uid(f"build:{scope}:{path.relative_to(ROOT)}"), file_refs[path], path.name))
        return rows

    app_sources = builds(app_swift + shared_swift, "app")
    widget_sources = builds(widget_swift + shared_swift, "widget")
    app_resource_builds = builds(app_resources, "app")

    product_ref = uid("product:app")
    widget_product = uid("product:widget")
    package_ref = uid("package:ScanAnythingCore")
    package_dep = uid("dep:ScanAnythingCore")
    framework_build = uid("build:ScanAnythingCore")
    embed_build = uid("build:embed:widget")
    sources_phase = uid("phase:sources")
    frameworks_phase = uid("phase:frameworks")
    resources_phase = uid("phase:resources")
    embed_phase = uid("phase:embed")
    widget_sources_phase = uid("phase:widget:sources")
    widget_frameworks_phase = uid("phase:widget:frameworks")
    widget_resources_phase = uid("phase:widget:resources")
    target_id = uid("target:app")
    widget_target = uid("target:widget")
    proxy_id = uid("proxy:widget")
    dependency_id = uid("dependency:widget")
    project_id = uid("project")
    main_group = uid("group:main")
    app_group = uid("group:app")
    shared_group = uid("group:shared")
    widget_group = uid("group:widget")
    products_group = uid("group:products")
    project_config_list = uid("configlist:project")
    target_config_list = uid("configlist:target")
    widget_config_list = uid("configlist:widget")
    project_debug = uid("config:project:debug")
    project_release = uid("config:project:release")
    target_debug = uid("config:target:debug")
    target_release = uid("config:target:release")
    widget_debug = uid("config:widget:debug")
    widget_release = uid("config:widget:release")

    roots = {APP: app_group, SHARED: shared_group, WIDGET: widget_group}
    group_ids: dict[Path, str] = dict(roots)
    for path in file_refs:
        parent = path.parent
        while parent not in roots and parent != ROOT:
            group_ids.setdefault(parent, uid(f"group:{parent.relative_to(ROOT)}"))
            parent = parent.parent

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
    for build_id, ref, name in app_sources + widget_sources:
        objects.append(f"\t\t{build_id} /* {name} in Sources */ = {{isa = PBXBuildFile; fileRef = {ref} /* {name} */; }};")
    for build_id, ref, name in app_resource_builds:
        objects.append(f"\t\t{build_id} /* {name} in Resources */ = {{isa = PBXBuildFile; fileRef = {ref} /* {name} */; }};")
    objects.append(f"\t\t{framework_build} /* ScanAnythingCore in Frameworks */ = {{isa = PBXBuildFile; productRef = {package_dep} /* ScanAnythingCore */; }};")
    objects.append(
        f"\t\t{embed_build} /* ScanAnythingWidget.appex in Embed Foundation Extensions */ = {{isa = PBXBuildFile; fileRef = {widget_product} /* ScanAnythingWidget.appex */; settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};"
    )
    objects.append("/* End PBXBuildFile section */")
    objects.append("")

    objects.append("/* Begin PBXContainerItemProxy section */")
    objects.append(f"\t\t{proxy_id} /* PBXContainerItemProxy */ = {{")
    objects.append("\t\t\tisa = PBXContainerItemProxy;")
    objects.append(f"\t\t\tcontainerPortal = {project_id} /* Project object */;")
    objects.append("\t\t\tproxyType = 1;")
    objects.append(f"\t\t\tremoteGlobalIDString = {widget_target};")
    objects.append("\t\t\tremoteInfo = ScanAnythingWidget;")
    objects.append("\t\t};")
    objects.append("/* End PBXContainerItemProxy section */")
    objects.append("")

    objects.append("/* Begin PBXCopyFilesBuildPhase section */")
    objects.append(f"\t\t{embed_phase} /* Embed Foundation Extensions */ = {{")
    objects.append("\t\t\tisa = PBXCopyFilesBuildPhase;")
    objects.append("\t\t\tbuildActionMask = 2147483647;")
    objects.append('\t\t\tdstPath = "";')
    objects.append("\t\t\tdstSubfolderSpec = 13;")
    objects.append("\t\t\tfiles = (")
    objects.append(f"\t\t\t\t{embed_build} /* ScanAnythingWidget.appex in Embed Foundation Extensions */,")
    objects.append("\t\t\t);")
    objects.append('\t\t\tname = "Embed Foundation Extensions";')
    objects.append("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    objects.append("\t\t};")
    objects.append("/* End PBXCopyFilesBuildPhase section */")
    objects.append("")

    objects.append("/* Begin PBXFileReference section */")
    for path, ref in sorted(file_refs.items(), key=lambda item: str(item[0])):
        objects.append(
            f"\t\t{ref} /* {path.name} */ = {{isa = PBXFileReference; lastKnownFileType = {file_kind(path)}; path = {quote(path.name)}; sourceTree = \"<group>\"; }};"
        )
    objects.append(
        f"\t\t{product_ref} /* ScanAnythingAI.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ScanAnythingAI.app; sourceTree = BUILT_PRODUCTS_DIR; }};"
    )
    objects.append(
        f"\t\t{widget_product} /* ScanAnythingWidget.appex */ = {{isa = PBXFileReference; explicitFileType = \"wrapper.app-extension\"; includeInIndex = 0; path = ScanAnythingWidget.appex; sourceTree = BUILT_PRODUCTS_DIR; }};"
    )
    objects.append("/* End PBXFileReference section */")
    objects.append("")

    def phase(phase_id: str, isa: str, comment: str, rows: list[tuple[str, str, str]], label: str) -> None:
        objects.append(f"\t\t{phase_id} /* {comment} */ = {{")
        objects.append(f"\t\t\tisa = {isa};")
        objects.append("\t\t\tbuildActionMask = 2147483647;")
        objects.append("\t\t\tfiles = (")
        for build_id, _, name in rows:
            objects.append(f"\t\t\t\t{build_id} /* {name} in {label} */,")
        objects.append("\t\t\t);")
        objects.append("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
        objects.append("\t\t};")

    objects.append("/* Begin PBXFrameworksBuildPhase section */")
    phase(frameworks_phase, "PBXFrameworksBuildPhase", "Frameworks", [(framework_build, "", "ScanAnythingCore")], "Frameworks")
    phase(widget_frameworks_phase, "PBXFrameworksBuildPhase", "Frameworks", [], "Frameworks")
    objects.append("/* End PBXFrameworksBuildPhase section */")
    objects.append("")

    objects.append("/* Begin PBXGroup section */")
    for directory, group_id in sorted(group_ids.items(), key=lambda item: str(item[0])):
        objects.append(f"\t\t{group_id} /* {directory.name} */ = {{")
        objects.append("\t\t\tisa = PBXGroup;")
        objects.append("\t\t\tchildren = (")
        objects.extend(children_of(directory))
        objects.append("\t\t\t);")
        objects.append(f"\t\t\tpath = {quote(directory.name)};")
        objects.append('\t\t\tsourceTree = "<group>";')
        objects.append("\t\t};")
    objects.append(f"\t\t{products_group} /* Products */ = {{")
    objects.append("\t\t\tisa = PBXGroup;")
    objects.append("\t\t\tchildren = (")
    objects.append(f"\t\t\t\t{product_ref} /* ScanAnythingAI.app */,")
    objects.append(f"\t\t\t\t{widget_product} /* ScanAnythingWidget.appex */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tname = Products;")
    objects.append('\t\t\tsourceTree = "<group>";')
    objects.append("\t\t};")
    objects.append(f"\t\t{main_group} = {{")
    objects.append("\t\t\tisa = PBXGroup;")
    objects.append("\t\t\tchildren = (")
    objects.append(f"\t\t\t\t{app_group} /* ScanAnythingAI */,")
    objects.append(f"\t\t\t\t{shared_group} /* Shared */,")
    objects.append(f"\t\t\t\t{widget_group} /* ScanAnythingWidget */,")
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
    objects.append(f"\t\t\t\t{embed_phase} /* Embed Foundation Extensions */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tbuildRules = (")
    objects.append("\t\t\t);")
    objects.append("\t\t\tdependencies = (")
    objects.append(f"\t\t\t\t{dependency_id} /* PBXTargetDependency */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tname = ScanAnythingAI;")
    objects.append("\t\t\tpackageProductDependencies = (")
    objects.append(f"\t\t\t\t{package_dep} /* ScanAnythingCore */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tproductName = ScanAnythingAI;")
    objects.append(f"\t\t\tproductReference = {product_ref} /* ScanAnythingAI.app */;")
    objects.append('\t\t\tproductType = "com.apple.product-type.application";')
    objects.append("\t\t};")
    objects.append(f"\t\t{widget_target} /* ScanAnythingWidget */ = {{")
    objects.append("\t\t\tisa = PBXNativeTarget;")
    objects.append(f"\t\t\tbuildConfigurationList = {widget_config_list} /* Build configuration list for PBXNativeTarget \"ScanAnythingWidget\" */;")
    objects.append("\t\t\tbuildPhases = (")
    objects.append(f"\t\t\t\t{widget_sources_phase} /* Sources */,")
    objects.append(f"\t\t\t\t{widget_frameworks_phase} /* Frameworks */,")
    objects.append(f"\t\t\t\t{widget_resources_phase} /* Resources */,")
    objects.append("\t\t\t);")
    objects.append("\t\t\tbuildRules = (")
    objects.append("\t\t\t);")
    objects.append("\t\t\tdependencies = (")
    objects.append("\t\t\t);")
    objects.append("\t\t\tname = ScanAnythingWidget;")
    objects.append("\t\t\tproductName = ScanAnythingWidget;")
    objects.append(f"\t\t\tproductReference = {widget_product} /* ScanAnythingWidget.appex */;")
    objects.append('\t\t\tproductType = "com.apple.product-type.app-extension";')
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
    objects.append(f"\t\t\t\t\t{widget_target} = {{")
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
    objects.append(f"\t\t\t\t{widget_target} /* ScanAnythingWidget */,")
    objects.append("\t\t\t);")
    objects.append("\t\t};")
    objects.append("/* End PBXProject section */")
    objects.append("")

    objects.append("/* Begin PBXResourcesBuildPhase section */")
    phase(resources_phase, "PBXResourcesBuildPhase", "Resources", app_resource_builds, "Resources")
    phase(widget_resources_phase, "PBXResourcesBuildPhase", "Resources", [], "Resources")
    objects.append("/* End PBXResourcesBuildPhase section */")
    objects.append("")

    objects.append("/* Begin PBXSourcesBuildPhase section */")
    phase(sources_phase, "PBXSourcesBuildPhase", "Sources", app_sources, "Sources")
    phase(widget_sources_phase, "PBXSourcesBuildPhase", "Sources", widget_sources, "Sources")
    objects.append("/* End PBXSourcesBuildPhase section */")
    objects.append("")

    objects.append("/* Begin PBXTargetDependency section */")
    objects.append(f"\t\t{dependency_id} /* PBXTargetDependency */ = {{")
    objects.append("\t\t\tisa = PBXTargetDependency;")
    objects.append(f"\t\t\ttarget = {widget_target} /* ScanAnythingWidget */;")
    objects.append(f"\t\t\ttargetProxy = {proxy_id} /* PBXContainerItemProxy */;")
    objects.append("\t\t};")
    objects.append("/* End PBXTargetDependency section */")
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
				CODE_SIGN_ENTITLEMENTS = ScanAnythingAI/ScanAnythingAI.entitlements;
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
    widget_base = """
				CODE_SIGN_ENTITLEMENTS = ScanAnythingWidget/ScanAnythingWidget.entitlements;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				GENERATE_INFOPLIST_FILE = YES;
				INFOPLIST_FILE = ScanAnythingWidget/Info.plist;
				INFOPLIST_KEY_CFBundleDisplayName = "Scan Anything";
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
					"@executable_path/../../Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = ai.scananything.app.widget;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SKIP_INSTALL = YES;
				SUPPORTED_PLATFORMS = "iphoneos iphonesimulator";
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = 1;
"""

    def configuration(config_id: str, name: str, body: str) -> None:
        objects.append(f"\t\t{config_id} /* {name} */ = {{")
        objects.append("\t\t\tisa = XCBuildConfiguration;")
        objects.append("\t\t\tbuildSettings = {")
        objects.append(body.rstrip())
        objects.append("\t\t\t};")
        objects.append(f"\t\t\tname = {name};")
        objects.append("\t\t};")

    objects.append("/* Begin XCBuildConfiguration section */")
    configuration(project_debug, "Debug", shared_settings + "\t\t\t\tONLY_ACTIVE_ARCH = YES;\n")
    configuration(project_release, "Release", release_shared)
    configuration(target_debug, "Debug", target_base)
    configuration(target_release, "Release", target_base)
    configuration(widget_debug, "Debug", widget_base)
    configuration(widget_release, "Release", widget_base)
    objects.append("/* End XCBuildConfiguration section */")
    objects.append("")

    def config_list(list_id: str, comment: str, debug_id: str, release_id: str) -> None:
        objects.append(f"\t\t{list_id} /* {comment} */ = {{")
        objects.append("\t\t\tisa = XCConfigurationList;")
        objects.append("\t\t\tbuildConfigurations = (")
        objects.append(f"\t\t\t\t{debug_id} /* Debug */,")
        objects.append(f"\t\t\t\t{release_id} /* Release */,")
        objects.append("\t\t\t);")
        objects.append("\t\t\tdefaultConfigurationIsVisible = 0;")
        objects.append("\t\t\tdefaultConfigurationName = Release;")
        objects.append("\t\t};")

    objects.append("/* Begin XCConfigurationList section */")
    config_list(project_config_list, 'Build configuration list for PBXProject "ScanAnythingAI"', project_debug, project_release)
    config_list(target_config_list, 'Build configuration list for PBXNativeTarget "ScanAnythingAI"', target_debug, target_release)
    config_list(widget_config_list, 'Build configuration list for PBXNativeTarget "ScanAnythingWidget"', widget_debug, widget_release)
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
    PROJECT.mkdir(parents=True, exist_ok=True)
    (PROJECT / "project.pbxproj").write_text(pbx, encoding="utf-8")

    scheme_dir = PROJECT / "xcshareddata" / "xcschemes"
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
               BlueprintIdentifier = "{widget_target}"
               BuildableName = "ScanAnythingWidget.appex"
               BlueprintName = "ScanAnythingWidget"
               ReferencedContainer = "container:ScanAnythingAI.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
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
    print(f"Wrote {PROJECT / 'project.pbxproj'} with {len(app_swift) + len(shared_swift)} app Swift files and {len(widget_swift)} widget Swift files")


if __name__ == "__main__":
    main()
