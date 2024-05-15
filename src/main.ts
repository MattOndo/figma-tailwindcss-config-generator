import { showUI, on } from '@create-figma-plugin/utilities'

export default function () {
  showUI({ width: 400, height: 500 });

  on('generate', Generate)
  on('copy', CopyToClipboard)
  on('close', () => figma.closePlugin())
  on('message', SendMessage)
  
  function SendMessage(message: string) {
    figma.notify(message);
  }
  
  // Main backend function, generate the styles and pass them to the UI
  function Generate(options:any) {
    
    const data: any = {
      colors: [],
      gradients: [],
      sizes: [],
      remBaseSize: {},
      effects: [],
    };
  
    const baseSize = Number(options.selectedBase);
  
    if (options.useRem) {
      data.useRem = true;
      data.remBaseSize = baseSize;
    }
  
    data.outputType = options.outputType;
    data.useRem = options.useRem;
  
    // No style checked
    if (!options.useColor && !options.useText && !options.useEffect) {
      figma.notify("⚠ Please select a style to generate.");
      return;
    }

    // Get local variables
    const localVariables = figma.variables.getLocalVariables().map((variable) => {
      return variable;
    });
  
    if (options.useColor) {
      // Colors from variables
      const colorStyles = localVariables.filter((variable) => variable.resolvedType === "COLOR");      
  
      // const paintStyles = figma.getLocalPaintStyles().filter((paintStyle) => {
      //   let color = paintStyle.paints[0] as SolidPaint;
      //   return color.type === "SOLID";
      // });
  
      const variableColors = colorStyles.map((colorStyle) => {
        const colorValues = colorStyle.valuesByMode as any;
        const colorKey = Object.keys(colorValues).map((key, index) => {
          return colorValues[key];
        });
        const color = colorKey[0];
        const rgb = {
          red: BeautifyColor(color.r),
          green: BeautifyColor(color.g),
          blue: BeautifyColor(color.b),
        };
  
        let ColorStyle = `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${color.a})`;

        switch (options.colorStyle.toUpperCase()) {
          case "HEX":
            ColorStyle = RGBToHex(rgb);
            break;
          case "HSLA":
            ColorStyle = RGBToHSL(rgb, color.a);
            break;
        }
        
        return {
          name: colorStyle.name.replace('/', '-'),
          ColorStyle: ColorStyle,
        };
      });
  
      data.colors = variableColors;

      // Colors from local styles
      const linearGradientStyles = figma.getLocalPaintStyles().filter((gradientStyle) => {  
        let color = gradientStyle.paints[0] as GradientPaint;
        return color.type === "GRADIENT_LINEAR";
      });

      if (linearGradientStyles?.length > 0) {
        const gradientColors = linearGradientStyles.map((gradientStyle) => {
          const color = gradientStyle.paints[0] as GradientPaint;
          const stops = color.gradientStops.map((stop) => {
            const rgb = {
              red: BeautifyColor(stop.color.r),
              green: BeautifyColor(stop.color.g),
              blue: BeautifyColor(stop.color.b),
            };
            return {
              color: `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${stop.color.a})`,
              position: `${stop.position * 100}%`,
            };
          });
          return {
            name: gradientStyle.name.replace('/', '-'),
            stops: stops.map((stop) => {
              return `${stop.color} ${stop.position}`;
            }).join(', ')
          };
        });
        data.gradients = gradientColors;
      }
    }

    if (options.useSpacing) {
      const spacingStyles = localVariables.filter((variable) => variable.resolvedType === "FLOAT");      
      console.log("🚀 ~ Generate ~ spacingStyles:", spacingStyles)
      
      // Get all FLOAT variables
      const floatVariables = spacingStyles.map((spacingStyle) => {
        const spacingVals = spacingStyle.valuesByMode as any;
        const spacingKey = Object.keys(spacingVals).map((key, index) => {
          return spacingVals[key];
        });
        let value: string = spacingKey[0];
        if (data.useRem) {
          const rawval = Number(value) / baseSize;
          if (spacingStyle.name === "0") {
            value = "0";
          } else if (spacingStyle.name === "px") {
            value = "1px";
          } else {
            value = `${+rawval.toFixed(2)}rem`;
          }
        } else {
          value = `${value}px`;
        }
        return {
          name: spacingStyle.name,
          value: value,
          scopes: spacingStyle.scopes,
        };
      });


      console.log("🚀 ~ Generate ~ floatVariables:", floatVariables)

      const borderRadius: any = [];
      const screens: any = [];
      const container: any = [];
      const spacing: any = [];

      floatVariables.forEach((variable) => {
        if (variable.scopes.includes("CORNER_RADIUS")) {
          borderRadius.push({
            name: variable.name,
            value: variable.value
          });
        } else if (variable.name.includes("max-")) {
          container.push({
            name: variable.name,
            value: variable.value
          });
        } else if (variable.scopes.includes("WIDTH_HEIGHT") && variable.scopes.includes("TEXT_CONTENT")) {
          
          const allowedNames = ['0', 'px', '0.5', '1.5', '2.5', '3.5'];
          let name = variable.name.replace(/\․+/g, '.');

          if (Number(name) > 0 || allowedNames.includes(name)) {
            spacing.push({
              name:name,
              value: variable.value
            });
          } else {
            screens.push({
              name:name,
              value: variable.value
            });
          }
        }
      });

      data.borderRadius = borderRadius;
      data.screens = screens;
      data.container = container;
      data.spacing = spacing;
    }
  
    if (options.useText) {
      const textStyles = figma.getLocalTextStyles();
  
      let leadings: any = [];
      let sizes: any = [];
      let weights: any = [];
      let fontFamilies: any = [];
      let letterSpacing: any = [];
      let classNames: any = [];
  
      for (let item of textStyles) {
        let names = item.name.split('/');
        for (let name of names) {
          if (!classNames.find((x:any) => x === name)) {
            classNames.push(name);
  
            if (name.includes('leading-')) {
              let value = null;
              if (item.lineHeight.unit === 'PIXELS') {
                value = `${item.lineHeight.value}px`;
              } else if (item.lineHeight.unit === 'PERCENT') {
                value = `${item.lineHeight.value / 100}em`;
              }
              leadings.push({name: name.split('-')[1], value: value, cssVarPrefix: 'line-height'});
            }
            if (name.includes('font-')) {
              console.log('🚀 ~ Generate ~ item:', item, name)
              let weightVal = (item.consumers[0].node as TextNode).fontWeight
              if (typeof weightVal === 'symbol') {
                // Backup for when the fontWeight is a symbol, TODO: find a better way to get font weight number values
                weightVal = (item.consumers[1].node as TextNode).fontWeight
              }
              weights.push({name: name.split('-')[1], value: weightVal, cssVarPrefix: 'font-weight'});
            }
            if (name.includes('text-')) {
              if (data.useRem) {
                const remSize = item.fontSize / baseSize;
                sizes.push({name: name.split('-')[1], value: `${+remSize.toFixed(2)}rem`});
              } else {
                sizes.push({name: name.split('-')[1], value: `${item.fontSize}px`, cssVarPrefix: 'font-size'});
              }
            }
          }
        }
  
        // Get unique font families
        if (!fontFamilies.find((x:any) => x.value === item.fontName.family)) {
          fontFamilies.push({name: `${item.fontName.family.toLowerCase()}`, value: item.fontName.family, cssVarPrefix: 'font-family'});
        }
  
        // Get unique letter spacing
        if (!letterSpacing.find((x:any) => x.originalValue === item.letterSpacing.value)) {
          let value = null;
          if (item.letterSpacing.unit === 'PIXELS') {
            value = item.letterSpacing.value / data.remBaseSize;
          } else if (item.letterSpacing.unit === 'PERCENT') {
            value = item.letterSpacing.value / 100;
          } else {
            value = item.letterSpacing.value;
          }
          let name = null;
          if (value === 0) {
            name = "normal";
          } else if (value > 0 && value < 0.025) {
            name = "wide";
          } else if (value > 0.025) {
            name = "wider";
          } else if (value < 0 && value > -0.025) {
            name = "narrow";
          } else if (value < -0.025) {
            name = "narrower";
          }
          letterSpacing.push({name: `${name}`, value: `${value}em`, originalValue: item.letterSpacing.value, cssVarPrefix: 'letter-spacing'});
        }
      }
      
      let fontStyles:any = {}
  
      fontStyles.fontSize = sizes;
      fontStyles.lineHeight = leadings;
      fontStyles.fontWeight = weights;
      fontStyles.fontFamily = fontFamilies;
      fontStyles.letterSpacing = letterSpacing;
      console.log('fontStyles',fontStyles)
      data.fontStyles = fontStyles;
    }
    
    if (options.useEffect) {
      const effectStyles = figma.getLocalEffectStyles();
      const effects = effectStyles.map((effectStyle) => {
        const { shadows, blur } = GenerateEffectStyle(effectStyle.effects);
  
        return {
          name: FixNaming(effectStyle.name),
          shadows: shadows,
          blur: blur,
        };
      });
  
      data.effects = effects;
    }
  
    if (
      data.colors?.length <= 0 &&
      data.fontStyles?.sizes?.length <= 0 &&
      data.effects?.length <= 0
    ) {
      figma.ui.postMessage({ type: "error", data: "no-styles-found" });
      figma.notify("⚠ No styles found.");
      return;
    }

    let output: any = {}
    if (options.outputType === "config") {
      output = GenerateTailwindTheme(data);
    } else if (options.outputType === "css-vars") {
      output = GenerateCssVars(data);
    }

    figma.ui.postMessage(
      { type:"generated", data: JSON.stringify(output) }
    );
  }
  
  function GenerateEffectStyle(effects:any) {
    const shadows:any = [];
    let blur = ``;
  
    effects.forEach((effect:any) => {
      if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
        shadows.push(GenerateShadowStyle(effect)); // can have multiple shadows on a single element
      } else if (effect.type === "LAYER_BLUR") {
        blur = `blur(${effect.radius}px)`; // can only have one blur-filter. Note: background_blur is not implemented in all browsers, so wont use that type of effect
      }
    });
  
    const result = {
      shadows: `${shadows}`,
      blur: blur,
    };
  
    return result;
  }
  
  function GenerateShadowStyle({ type, color, offset, radius }: any) {
    const alpha = Math.round(color.a * 100) / 100; // removes trailing numbers and beautifies the alpha (example: 0.05999943 becomes 0.06)
    const rgba = `rgba(${BeautifyColor(color.r)}, ${BeautifyColor(
      color.g
    )}, ${BeautifyColor(color.b)}, ${alpha})`;
  
    // If the effect is set as INNER_SHADOW, the shadow should be set to inset (this is how Figma shows it in the code-tab)
    return `${type === "INNER_SHADOW" ? "inset" : ""} ${offset.x}px ${offset.y}px ${radius}px ${rgba}`;
  }
  
  // Reason for this to be a backend function is that the UI doesn't have access to the notify function
  function CopyToClipboard(data:string) {
    figma.ui.postMessage({ type: "copy" });
    figma.notify("📋 Styles copied to clipboard.");
  }
  
  // Figma uses slashes for grouping styles together. This turns that slash into a dash
  function FixNaming(name: string) {
    return CamelCaseToKebabCase(
      name
        .trim()
        .replace(/([\/])/g, "--") // Figma uses / to separate different substyles, change this to BEM modifier
        .replace(/([\ ])/g, "-") // Remove any spaces
    ).toLowerCase();
  }
  
  function CamelCaseToKebabCase(name: string) {
    return `${name.charAt(0)}${name
      .substr(1)
      .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2")}`; // camelCase to kebab-case
  }
  
  // Figma stores the color value as a 0 to 1 decimal instead of 0 to 255.
  function BeautifyColor(colorValue:any) {
    return Math.round(colorValue * 255);
  }
  
  // Takes a single color (red, green, or blue) and changes it to hex
  function ColorToHex(rgb:any) {
    let hex = Number(rgb).toString(16);
    if (hex.length < 2) {
      hex = "0" + hex;
    }
    return hex.toUpperCase();
  }
  
  function RGBToHex(rgb:any) {
    const red = ColorToHex(rgb.red);
    const green = ColorToHex(rgb.green);
    const blue = ColorToHex(rgb.blue);
    return `#${red}${green}${blue}`;
  }
  
  function RGBToHSL(rgb:any, alpha:any) {
    // Make red, green, and blue fractions of 1
    rgb.red /= 255;
    rgb.green /= 255;
    rgb.blue /= 255;
  
    // Find greatest and smallest channel values
    let cmin = Math.min(rgb.red, rgb.green, rgb.blue),
      cmax = Math.max(rgb.red, rgb.green, rgb.blue),
      delta = cmax - cmin,
      hue = 0,
      saturation = 0,
      lightness = 0;
    if (delta == 0) hue = 0;
    // Red is max
    else if (cmax == rgb.red) hue = ((rgb.green - rgb.blue) / delta) % 6;
    // Green is max
    else if (cmax == rgb.green) hue = (rgb.blue - rgb.red) / delta + 2;
    // Blue is max
    else hue = (rgb.red - rgb.green) / delta + 4;
  
    hue = Math.round(hue * 60);
  
    // Make negative hues positive behind 360°
    if (hue < 0) hue += 360;
  
    lightness = (cmax + cmin) / 2;
  
    // Calculate saturation
    saturation = delta == 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  
    // Multiply l and s by 100
    saturation = +(saturation * 100).toFixed(1);
    lightness = +(lightness * 100).toFixed(1);
  
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  }

  function GenerateTailwindTheme(data:any) {
    let output = 'theme: {\n';

    if (data?.colors?.length > 0) {
      let colors: any = {};
      data.colors.forEach((color: any) => {
        let [colorName, shade] = color.name.split('-');

        if (!colors[colorName]) {
          colors[colorName] = {};
        }
        colors[colorName][shade] = color.ColorStyle;
      });

      output += "  colors: {\n";
      for (let colorName in colors) {
        if (typeof colors[colorName]['undefined'] !== 'undefined') {
          output += `    "${colorName}": "${colors[colorName]['undefined']}",\n`;
        } else {
          output += `    "${colorName}": {\n`;
          for (let shade in colors[colorName]) {
            output += `      ${shade}: "${colors[colorName][shade]}",\n`;
          }
          output += "    },\n";
        }
      }
      output += "  },\n";
    }

    if (data?.fontStyles) {
      for (let fontStyle in data.fontStyles) {
        output += "  "+fontStyle+": {\n";
        data.fontStyles[fontStyle].forEach((style: any) => {
          output += `    "${style.name}": "${style.value}",\n`;
        });
        output += "  },\n";
      }
    }

    if (data?.effects?.length > 0) {
      let effects: any = {};
      data.effects.forEach((effect:any) => {
        if (effect.blur === ``) {
          effects[effect.name] = effect.shadows;
        } else {
          // blur exists, split effect into two
          effects[`${effect.name}-shadows`] = effect.shadows;
          effects[`${effect.name}-blur`] = effect.blur;
        }
      });

      output += "  boxShadow: {\n";
      for (let effectName in effects) {
        const classPart = effectName.split('-')[1] || 'DEFAULT';
        output += `    "${classPart}": "${effects[effectName]}",\n`;
      }
      output += "  },\n";
    }

    if (data?.spacing?.length > 0) {
      output += "  spacing: {\n";
      data.spacing.forEach((spacing: any) => {
        output += `    "${spacing.name}": "${spacing.value}",\n`;
      });
      output += "  },\n";
    }

    if (data?.screens?.length > 0) {
      output += "  screens: {\n";
      data.screens.forEach((screen: any) => {
        output += `    "${screen.name}": "${screen.value}",\n`;
      });
      output += "  },\n";
    }

    if (data?.borderRadius?.length > 0) {
      output += "  borderRadius: {\n";
      data.borderRadius.forEach((borderRadius: any) => {
        output += `    "${borderRadius.name}": "${borderRadius.value}",\n`;
      });
      output += "  },\n";
    }

    if (data?.gradients?.length > 0) {
      let gradients: any = {};
      data.gradients.forEach((gradient: any) => {
        let [gradientName, shade] = gradient.name.split('-');

        if (!gradients[gradientName]) {
          gradients[gradientName] = {};
        }
        gradients[gradientName][shade] = gradient.stops;
      });

      output += "  extend: {\n    backgroundImage: (theme) => ({\n";
      output += "      gradients: {\n";
      for (let gradientName in gradients) {
        const name = gradientName.trim().toLowerCase().replace(' ','-');
        output += `        "${gradientName.trim().toLowerCase().replace(' ','-')}": {\n`;
        for (let shade in gradients[gradientName]) {
          const shadeName = shade.trim().toLowerCase().replace(/\s+/g, '-');
          output += `          "${shadeName}": "linear-gradient(${gradients[gradientName][shade]})",\n`;
        }
        output += "        },\n";
      }
      output += "      }\n    }\n";
    }

    output += "  }\n}\n";

    return output;
  }

  function GenerateCssVars(data:any) {
    let output = '';

    if (data?.colors?.length > 0) {
      if (output !== "") {
        output += "  \n";
      }
      
      output += "/* Colors */\n";
      data.colors.forEach((color: any) => {
        output += `--color-${color.name}: ${color.ColorStyle};\n`;
      });


      if (data?.gradients?.length > 0) {
        let gradients: any = {};
        data.gradients.forEach((gradient: any) => {
          let [gradientName, shade] = gradient.name.split('-');

          if (!gradients[gradientName]) {
            gradients[gradientName] = {};
          }
          gradients[gradientName][shade] = gradient.stops;
        });

        if (output !== "") {
          output += "  \n";
        }
        output += "/* Gradients */\n";
        for (let gradientName in gradients) {
          const name = gradientName.trim().toLowerCase().replace(/\s+/g, '-');
          for (let shade in gradients[gradientName]) {
            const shadeName = shade.trim().toLowerCase().replace(/\s+/g, '-');
            output += `--gradient-${name + "-" + shadeName}": "linear-gradient(${gradients[gradientName][shade]})",\n`;
          }
        }
      }
    }

    if (data?.fontStyles) {

      for (let fontStyle in data.fontStyles) {
        output += `\n/* ${fontStyle} */\n`;
        console.log('🚀 ~ GenerateCssVars ~ fontStyle:', fontStyle)
        data.fontStyles[fontStyle].forEach((style: any) => {
          output += `--${style.cssVarPrefix}-${style.name}: ${style.value};\n`;
        });
      }
    }

    if (data?.effects?.length > 0) {
      if (output !== "") {
        output += "  \n";
      }
      
      output += "/* Effects */\n";
      data.effects.forEach((effect: any) => {
        if (effect.blur === ``) {
          output += `--${effect.name}: ${
            effect.shadows
          };\n`;
        } else {
          // blur exists, split effect into two
          output += `--${effect.name}-shadows: ${
            effect.shadows
          };\n`;
          output += `--${effect.name}-blur: ${
            effect.blur
          };\n`;
        }
      });
    }

    if (data?.spacing?.length > 0) {
      if (output !== "") {
        output += "  \n";
      }
      output += "/* Spacing */\n";
      data.spacing.forEach((spacing: any) => {
        output += `--spacing-${spacing.name}: ${spacing.value},\n`;
      });
    }

    if (data?.screens?.length > 0) {
      if (output !== "") {
        output += "  \n";
      }
      output += "/* Breakpoints */\n";
      data.screens.forEach((screen: any) => {
        output += `--breakpoint-${screen.name}: ${screen.value},\n`;
      });
    }

    if (data?.borderRadius?.length > 0) {
      if (output !== "") {
        output += "  \n";
      }
      output += "/* Border Radius */\n";
      data.borderRadius.forEach((borderRadius: any) => {
        output += `--${borderRadius.name.replace('rounded', 'radius')}: ${borderRadius.value},\n`;
      });
    }
    
    return output;
  }
}
